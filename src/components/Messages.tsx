import { messageId } from '../lib/messages';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { allPages } from '../lib/records';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { toast } from 'sonner';

interface Contact { id: string; name: string; accepting_requests: boolean }
interface Conversation { id: string; student_id: string; counselor_id: string; created_at: string }
interface Message { id: string; conversation_id: string; sender_id: string; body: string; created_at: string; read_at: string | null }

export function Messages() {
  const { user, profile } = useAuth();
  if (!user || !profile) return null;
  return <MessagingInbox key={user.id} userId={user.id} counselor={profile.role === 'counselor'} />;
}

function MessagingInbox({ userId, counselor }: { userId: string; counselor: boolean }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [accepting, setAccepting] = useState(false);
  const [active, setActive] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let running = false;
    async function load() {
      if (running) return;
      running = true;
      try {
        const results = await Promise.all([
          supabase.rpc('messaging_contacts'),
          allPages<Conversation>((from, to) => supabase.from('conversations').select('*').order('created_at', { ascending: false }).order('id').range(from, to)),
          allPages<{ conversation_id: string }>((from, to) => supabase.from('messages').select('conversation_id').neq('sender_id', userId).is('read_at', null).order('id').range(from, to)),
          counselor ? supabase.from('counselor_availability').select('accepting_requests').eq('counselor_id', userId).maybeSingle() : Promise.resolve({ data: null, error: null }),
        ]);
        if (results[0].error || results[3].error) throw new Error('Inbox unavailable');
        if (cancelled) return;
        setContacts(results[0].data ?? []);
        setConversations(results[1]);
        const counts: Record<string, number> = {};
        results[2].forEach((row) => { counts[row.conversation_id] = (counts[row.conversation_id] ?? 0) + 1; });
        setUnread(counts);
        setAccepting(results[3].data?.accepting_requests ?? false);
        setError(false);
      } catch { if (!cancelled) setError(true); }
      finally { running = false; if (!cancelled) setLoading(false); }
    }
    load();
    const timer = window.setInterval(load, 10000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [userId, counselor, revision]);

  async function start(contact: Contact) {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try {
      const { data, error } = await supabase.rpc('start_conversation', { target_counselor: contact.id });
      if (error) throw error;
      setActive(data);
      setRevision((value) => value + 1);
    } catch { toast.error('Could not open a conversation. This counselor may no longer be accepting requests.'); }
    finally { lock.current = false; setBusy(false); }
  }
  async function toggleAvailability() {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try {
      const { error } = await supabase.from('counselor_availability').upsert({ counselor_id: userId, accepting_requests: !accepting });
      if (error) throw error;
      setAccepting(!accepting); setRevision((value) => value + 1);
    } catch { toast.error('Could not update availability. Please try again.'); }
    finally { lock.current = false; setBusy(false); }
  }
  const selected = conversations.find((item) => item.id === active);
  const contactName = (conversation: Conversation) => contacts.find((item) => item.id === (counselor ? conversation.student_id : conversation.counselor_id))?.name ?? (counselor ? 'Student' : 'Counselor');

  return <div className="p-5 lg:p-8 max-w-5xl space-y-5">
    <h2 className="text-3xl font-medium text-slate-800">Messages</h2>
    <p className="text-sm text-slate-500">Private conversations between a student and their selected counselor. New messages refresh every 10 seconds while this screen is open. Replies may take time.</p>
    {!counselor && <p className="text-sm text-slate-600">For immediate help, contact your school guidance office or use the <Link className="text-teal-700 underline" to="/student/resources">Support page</Link>.</p>}
    {counselor && <Card className="p-4 flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium text-sm">{accepting ? 'Accepting new requests' : 'Not accepting new requests'}</p><p className="text-xs text-slate-500">Existing conversations remain open. This is not an online status.</p></div><Button disabled={busy || loading || error} onClick={toggleAvailability}>{accepting ? 'Pause new requests' : 'Accept new requests'}</Button></Card>}
    {loading ? <p role="status">Loading inbox…</p> : error ? <p role="alert">Could not refresh your inbox. <button className="underline" onClick={() => setRevision((value) => value + 1)}>Retry</button></p> : null}
    <div className="grid md:grid-cols-[240px_1fr] gap-4">
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Conversations</h3>
        {!loading && !error && !conversations.length && <p className="text-sm text-slate-500">No conversations yet.{counselor ? ' Accept requests so students can contact you.' : ''}</p>}
        {conversations.map((conversation) => <button key={conversation.id} onClick={() => setActive(conversation.id)} aria-pressed={active === conversation.id} className={`w-full text-left p-3 rounded-xl border text-sm ${active === conversation.id ? 'bg-teal-50 border-teal-500' : 'bg-white border-stone-200'}`}>
          {contactName(conversation)}{unread[conversation.id] > 0 && <span className="ml-2 text-teal-700 font-semibold">{unread[conversation.id]} unread</span>}
        </button>)}
        {!counselor && !loading && !error && <div className="space-y-2 pt-3"><h3 className="font-semibold text-sm">Consult a counselor</h3>
          {contacts.filter((contact) => !conversations.some((item) => item.counselor_id === contact.id)).map((contact) => <div key={contact.id} className="bg-white border rounded-xl p-3 text-sm"><p>{contact.name}</p><p className="text-xs text-slate-500 mb-2">{contact.accepting_requests ? 'Accepting requests' : 'Not accepting new requests'}</p><Button size="sm" disabled={!contact.accepting_requests || busy} onClick={() => start(contact)}>Start conversation</Button></div>)}
          {!contacts.some((contact) => contact.accepting_requests) && <p className="text-xs text-slate-500">No counselor is accepting new requests right now. You can still reply in existing conversations.</p>}
        </div>}
      </div>
      {selected ? <MessageThread key={selected.id} conversationId={selected.id} userId={userId} name={contactName(selected)} onRead={() => setRevision((value) => value + 1)} /> : <Card className="p-8 text-sm text-slate-500">Choose a conversation to read or send a message.</Card>}
    </div>
  </div>;
}

function MessageThread({ conversationId, userId, name, onRead }: { conversationId: string; userId: string; name: string; onRead: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sending, setSending] = useState(false);
  const [limit, setLimit] = useState(50);
  const [revision, setRevision] = useState(0);
  const pending = useRef<{ id: string; body: string } | null>(null);
  const lock = useRef(false);
  const onReadRef = useRef(onRead); onReadRef.current = onRead;
  useEffect(() => {
    let cancelled = false; let running = false;
    async function load() {
      if (running) return;
      running = true;
      try {
        const rows = await allPages<Message>((from, to) => supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: false }).order('id', { ascending: false }).range(from, to), limit);
        if (cancelled) return;
        setMessages(rows.slice(0, limit).reverse()); setError(false);
        if (!document.hidden && document.hasFocus()) {
          const ids = rows.filter((item) => item.sender_id !== userId && !item.read_at).map((item) => item.id);
          if (ids.length) {
            const { error } = await supabase.rpc('mark_messages_read', { message_ids: ids });
            if (!error && !cancelled) onReadRef.current();
          }
        }
      } catch { if (!cancelled) setError(true); }
      finally { running = false; if (!cancelled) setLoading(false); }
    }
    load(); const timer = window.setInterval(load, 10000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [conversationId, userId, revision, limit]);
  async function send(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || lock.current) return;
    lock.current = true; setSending(true);
    try {
      if (pending.current?.body !== body) pending.current = { id: messageId(), body };
      const { error } = await supabase.from('messages').insert({ id: pending.current.id, conversation_id: conversationId, body });
      // A retry after a lost response uses the same id, so it cannot duplicate a message.
      if (error && error.code !== '23505') throw error;
      pending.current = null; setDraft(''); setRevision((value) => value + 1); onReadRef.current();
    } catch { toast.error('Message was not confirmed. Your draft is kept; please try again.'); }
    finally { lock.current = false; setSending(false); }
  }
  return <Card className="p-4 space-y-4 min-w-0">
    <h3 className="font-semibold">{name}</h3>
    {loading && <p role="status">Loading messages…</p>}
    {error && <p role="alert" className="text-sm">Could not refresh messages. <button className="underline" onClick={() => setRevision((value) => value + 1)}>Retry</button></p>}
    {messages.length >= limit && <Button variant="outline" onClick={() => setLimit((value) => value + 50)}>Load older messages</Button>}
    <div className="max-h-[50vh] overflow-y-auto space-y-3" aria-label="Conversation messages">
      {!loading && !error && !messages.length && <p className="text-sm text-slate-500">Send a message to request assistance.</p>}
      {messages.map((message) => <div key={message.id} className={`p-3 rounded-xl text-sm ${message.sender_id === userId ? 'bg-teal-50 ml-6' : 'bg-stone-100 mr-6'}`}><p className="whitespace-pre-wrap break-words">{message.body}</p><p className="text-xs text-slate-500 mt-1">{message.sender_id === userId ? 'You' : name} · {new Date(message.created_at).toLocaleString()}{message.sender_id === userId && ` · ${message.read_at ? 'Read' : 'Sent'}`}</p></div>)}
    </div>
    <form onSubmit={send} className="space-y-2"><label className="text-sm block">Message<textarea aria-label="Message" className="block w-full rounded-xl border p-3 mt-1" rows={3} maxLength={4000} value={draft} onChange={(event) => setDraft(event.target.value)} disabled={sending} required /></label><p className="text-xs text-slate-500">{draft.length}/4000</p><Button type="submit" disabled={!draft.trim() || sending}>{sending ? 'Sending…' : 'Send message'}</Button></form>
  </Card>;
}
