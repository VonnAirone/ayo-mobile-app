-- Counselor reports, two-party messaging, and append-only professional reviews.
BEGIN;

-- Roles are permissions, not a self-selected signup preference. Existing roles
-- are preserved. New counselors must be promoted by a trusted administrator.
CREATE OR REPLACE FUNCTION public.protect_profile_role() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.role := 'student';
  ELSIF NEW.role IS DISTINCT FROM OLD.role AND auth.role() IN ('anon', 'authenticated') THEN
    RAISE EXCEPTION 'Only an administrator can change account roles';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_profile_role ON public.profiles;
CREATE TRIGGER protect_profile_role BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

CREATE TABLE IF NOT EXISTS public.counselor_availability (
  counselor_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  accepting_requests boolean NOT NULL DEFAULT false
);
ALTER TABLE public.counselor_availability ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.counselor_availability FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.counselor_availability TO authenticated;
CREATE POLICY "Counselors manage own availability" ON public.counselor_availability
  FOR ALL TO authenticated USING (counselor_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'counselor'
  )) WITH CHECK (counselor_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'counselor'
  ));

CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  counselor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, counselor_id),
  CHECK (student_id <> counselor_id)
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.conversations FROM anon, authenticated;
GRANT SELECT ON public.conversations TO authenticated;
CREATE POLICY "Participants read conversations" ON public.conversations FOR SELECT TO authenticated
  USING ((student_id = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'student'))
    OR (counselor_id = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'counselor')));

-- Return only the names needed by the messaging directory; do not broaden
-- access to profile rows or student records.
CREATE OR REPLACE FUNCTION public.messaging_contacts()
RETURNS TABLE (id uuid, name text, accepting_requests boolean)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.name::text, coalesce(a.accepting_requests, false)
  FROM public.profiles p LEFT JOIN public.counselor_availability a ON a.counselor_id = p.id
  WHERE auth.uid() IS NOT NULL AND (
    (EXISTS (SELECT 1 FROM public.profiles me WHERE me.id = auth.uid() AND me.role = 'student')
      AND p.role = 'counselor')
    OR (EXISTS (SELECT 1 FROM public.profiles me WHERE me.id = auth.uid() AND me.role = 'counselor')
      AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.counselor_id = auth.uid() AND c.student_id = p.id))
  );
$$;
REVOKE ALL ON FUNCTION public.messaging_contacts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.messaging_contacts() TO authenticated;

CREATE OR REPLACE FUNCTION public.start_conversation(target_counselor uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE conversation_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'student') THEN
    RAISE EXCEPTION 'Only students can request a conversation';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = target_counselor AND role = 'counselor') THEN
    RAISE EXCEPTION 'Counselor unavailable';
  END IF;
  SELECT id INTO conversation_id FROM public.conversations WHERE student_id = auth.uid() AND counselor_id = target_counselor;
  IF conversation_id IS NOT NULL THEN RETURN conversation_id; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.counselor_availability WHERE counselor_id = target_counselor AND accepting_requests) THEN
    RAISE EXCEPTION 'This counselor is not accepting new requests';
  END IF;
  INSERT INTO public.conversations (student_id, counselor_id) VALUES (auth.uid(), target_counselor)
    ON CONFLICT (student_id, counselor_id) DO NOTHING;
  SELECT id INTO conversation_id FROM public.conversations WHERE student_id = auth.uid() AND counselor_id = target_counselor;
  RETURN conversation_id;
END;
$$;
REVOKE ALL ON FUNCTION public.start_conversation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_conversation(uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX IF NOT EXISTS messages_conversation_date_idx ON public.messages (conversation_id, created_at DESC, id);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.messages FROM anon, authenticated;
GRANT SELECT ON public.messages TO authenticated;
GRANT INSERT (id, conversation_id, body) ON public.messages TO authenticated;
CREATE POLICY "Participants read messages" ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id));
CREATE POLICY "Participants send messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id));

CREATE OR REPLACE FUNCTION public.mark_messages_read(message_ids uuid[]) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.messages m SET read_at = now()
  WHERE m.id = ANY(message_ids) AND m.sender_id <> auth.uid() AND m.read_at IS NULL
    AND EXISTS (SELECT 1 FROM public.conversations c JOIN public.profiles p ON p.id = auth.uid()
      WHERE c.id = m.conversation_id AND ((c.student_id = p.id AND p.role = 'student') OR (c.counselor_id = p.id AND p.role = 'counselor')));
$$;
REVOKE ALL ON FUNCTION public.mark_messages_read(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_messages_read(uuid[]) TO authenticated;

CREATE TABLE IF NOT EXISTS public.priority_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  priority text NOT NULL CHECK (priority IN ('routine', 'follow_up', 'urgent')),
  rationale text NOT NULL CHECK (char_length(btrim(rationale)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS priority_reviews_student_date_idx ON public.priority_reviews (student_id, created_at DESC, id);
ALTER TABLE public.priority_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.priority_reviews FROM anon, authenticated;
GRANT SELECT ON public.priority_reviews TO authenticated;
GRANT INSERT (student_id, priority, rationale) ON public.priority_reviews TO authenticated;
CREATE POLICY "Counselors read reviews" ON public.priority_reviews FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'counselor'));
CREATE POLICY "Counselors record reviews" ON public.priority_reviews FOR INSERT TO authenticated
  WITH CHECK (reviewer_id = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'counselor')
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = student_id AND role = 'student'));
COMMIT;
