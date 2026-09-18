import { ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';
import { messageId } from '../lib/messages';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { allPages } from '../lib/records';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { toast } from 'sonner';

function initials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => Array.from(part)[0]).join('').toUpperCase() || '?';
}

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
  const contactStripRef = useRef<HTMLDivElement>(null);
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

  return <div className="p-5 lg:p-8 w-full min-w-0 max-w-5xl space-y-5">
    <h2 className="text-3xl font-medium text-slate-800">Messages</h2>
    {counselor && <Card className="p-4 flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium text-sm">{accepting ? 'Accepting new requests' : 'Not accepting new requests'}</p></div><Button disabled={busy || loading || error} onClick={toggleAvailability}>{accepting ? 'Pause new requests' : 'Accept new requests'}</Button></Card>}
    {loading ? <p role="status">Loading inbox…</p> : error ? <p role="alert">Could not refresh your inbox. <button className="underline" onClick={() => setRevision((value) => value + 1)}>Retry</button></p> : null}
    {!loading && !error && (
      <section aria-label={counselor ? 'Student contacts' : 'Counselor contacts'} className="min-w-0">
        <div className="flex items-center gap-2">
          {contacts.length > 0 && <button type="button" aria-label="Scroll contacts left" onClick={() => contactStripRef.current?.scrollBy({ left: -240, behavior: 'smooth' })} className="hidden sm:flex shrink-0 rounded-full p-1.5 text-slate-500 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-teal-600"><ChevronLeft className="h-4 w-4" /></button>}
          <div ref={contactStripRef} role="group" aria-label="Scrollable contacts" className="flex min-w-0 flex-1 gap-3 overflow-x-auto overscroll-x-contain snap-x snap-proximity scrollbar-none py-2 px-1">
          {contacts.map((contact) => {
            const conversation = conversations.find((item) => (counselor ? item.student_id : item.counselor_id) === contact.id);
            const isActive = !!conversation && active === conversation.id;
            const unreadCount = conversation ? unread[conversation.id] ?? 0 : 0;
            const disabled = !conversation && (counselor || !contact.accepting_requests || busy);
            const status = counselor ? 'Open conversation' : contact.accepting_requests ? 'Accepting requests' : conversation ? 'Existing chat open' : 'Not accepting requests';
            return <button
              key={contact.id}
              type="button"
              disabled={disabled}
              aria-pressed={isActive}
              aria-label={`${conversation ? 'Open conversation with' : 'Start conversation with'} ${contact.name}. ${status}${unreadCount ? `. ${unreadCount} unread messages` : ''}`}
              title={`${contact.name} · ${status}`}
              onClick={() => conversation ? setActive(conversation.id) : start(contact)}
              className="group flex w-24 flex-none snap-start flex-col items-center gap-2 rounded-xl py-1 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="relative">
                <span aria-hidden="true" className={`flex h-16 w-16 items-center justify-center rounded-full text-lg font-semibold transition-colors ${isActive ? 'bg-teal-600 text-white ring-2 ring-teal-600 ring-offset-4' : 'bg-teal-50 text-teal-700 ring-1 ring-teal-100 group-hover:bg-teal-100'}`}>{initials(contact.name)}</span>
                {!counselor && <span aria-hidden="true" className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-[3px] border-white ${contact.accepting_requests ? 'bg-emerald-500' : 'bg-stone-300'}`} />}
                {unreadCount > 0 && <span aria-hidden="true" className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-5 text-white ring-2 ring-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
              </span>
              <span className={`line-clamp-2 w-full break-words text-xs leading-4 ${isActive ? 'font-semibold text-teal-800' : 'text-slate-600'}`}>{contact.name}</span>
            </button>;
          })}
          </div>
          {contacts.length > 0 && <button type="button" aria-label="Scroll contacts right" onClick={() => contactStripRef.current?.scrollBy({ left: 240, behavior: 'smooth' })} className="hidden sm:flex shrink-0 rounded-full p-1.5 text-slate-500 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-teal-600"><ChevronRight className="h-4 w-4" /></button>}
        </div>
        {!contacts.length && <p className="text-sm text-slate-500">{counselor ? 'No student contacts yet.' : 'No counselors yet.'}</p>}
      </section>
    )}
    <div className="grid min-w-0 md:grid-cols-[240px_minmax(0,1fr)] gap-4">
      <div className="min-w-0 space-y-3">
        <h3 className="font-semibold text-sm text-slate-800">Message history</h3>
        {!loading && !error && !conversations.length && <p className="text-sm text-slate-500">No conversations yet.</p>}
        {conversations.map((conversation) => <button key={conversation.id} onClick={() => setActive(conversation.id)} aria-pressed={active === conversation.id} className={`flex w-full items-center gap-3 text-left p-3 rounded-2xl border text-sm transition-colors ${active === conversation.id ? 'bg-teal-50 border-teal-300' : 'bg-white border-stone-200 hover:bg-stone-50'}`}>
          <span aria-hidden="true" className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-800">{initials(contactName(conversation))}</span>
          <span className="min-w-0 flex-1"><span className="block truncate font-medium text-slate-700">{contactName(conversation)}</span><span className="block text-xs text-slate-500 mt-0.5">{unread[conversation.id] > 0 ? `${unread[conversation.id]} unread` : ''}</span></span>
          {unread[conversation.id] > 0 ? <span aria-hidden="true" className="h-2.5 w-2.5 flex-none rounded-full bg-teal-600" /> : <MessageCircle aria-hidden="true" className="h-4 w-4 flex-none text-slate-400" />}
        </button>)}
      </div>
      {selected ? <MessageThread key={selected.id} conversationId={selected.id} userId={userId} name={contactName(selected)} onRead={() => setRevision((value) => value + 1)} /> : <Card className="p-8 text-sm text-slate-500">Select a chat to get started.</Card>}
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
