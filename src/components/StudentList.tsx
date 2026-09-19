import { useEffect, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Search, Users, Pencil, Trash2, X, AlertCircle, Heart, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { StudentDetailView } from './StudentDetailView';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import type { CounselorOutletContext, CounselorStudent } from './CounselorDashboard';

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

function formatLastSeen(dateString: string): string {
  if (!dateString) return 'No check-ins';
  const d = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return `${d}d ago`;
}

const ALERT_ORDER: Record<string, number> = { high: 0, medium: 1, none: 2 };

type FilterKey = 'active-today' | 'high' | 'medium';

const FILTER_META: Record<FilterKey, {
  label: string;
  icon: typeof AlertCircle;
  iconClass: string;
}> = {
  'active-today': {
    label: 'Active today',
    icon: CheckCircle2,
    iconClass: 'text-emerald-600',
  },
  high: {
    label: 'High priority',
    icon: AlertCircle,
    iconClass: 'text-rose-500',
  },
  medium: {
    label: 'Follow-up',
    icon: Heart,
    iconClass: 'text-pink-500',
  },
};

const FILTER_ORDER: FilterKey[] = ['active-today', 'high', 'medium'];

function isToday(dateString: string): boolean {
  if (!dateString) return false;
  return new Date(dateString).toDateString() === new Date().toDateString();
}

export function StudentList() {
  const { students, refreshStudents } = useOutletContext<CounselorOutletContext>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<CounselorStudent | null>(null);

  // Auto-open a student when arriving with ?student=<id> (e.g. from Needs Attention cards).
  useEffect(() => {
    const id = searchParams.get('student');
    if (!id) return;
    const match = students.find((s) => s.id === id);
    if (match) {
      setSelectedStudent(match);
      const next = new URLSearchParams(searchParams);
      next.delete('student');
      setSearchParams(next, { replace: true });
    }
  }, [students, searchParams, setSearchParams]);

  useEffect(() => {
    setSelectedStudent((current) => current ? students.find((student) => student.id === current.id) ?? null : null);
  }, [students]);

  const rawFilter = searchParams.get('filter');
  const activeFilter: FilterKey | null =
    rawFilter === 'active-today' || rawFilter === 'high' || rawFilter === 'medium'
      ? rawFilter
      : null;

  const [sort, setSort] = useState('priority');

  function setFilter(key: FilterKey | null) {
    const next = new URLSearchParams(searchParams);
    if (key) next.set('filter', key);
    else next.delete('filter');
    setSearchParams(next, { replace: true });
  }

  // Edit state
  const [editTarget, setEditTarget] = useState<CounselorStudent | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<CounselorStudent | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredStudents = students
    .filter((s) => {
      if (activeFilter === 'active-today') return isToday(s.lastCheckIn);
      if (activeFilter === 'high') return s.alertLevel === 'high';
      if (activeFilter === 'medium') return s.alertLevel === 'medium';
      return true;
    })
    .filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'recent') return (Date.parse(b.lastCheckIn) || 0) - (Date.parse(a.lastCheckIn) || 0);
      return ALERT_ORDER[a.alertLevel] - ALERT_ORDER[b.alertLevel] || a.name.localeCompare(b.name);
    });

  function openEdit(student: CounselorStudent, e: React.MouseEvent) {
    e.stopPropagation();
    setEditTarget(student);
    setEditName(student.name);
  }

  function openDelete(student: CounselorStudent, e: React.MouseEvent) {
    e.stopPropagation();
    setDeleteTarget(student);
  }

  async function handleSaveEdit() {
    if (!editTarget || !editName.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ name: editName.trim() })
      .eq('id', editTarget.id);

    if (error) {
      toast.error('Failed to update student name.');
    } else {
      toast.success('Student name updated.');
      if (selectedStudent?.id === editTarget.id) {
        setSelectedStudent((prev) => prev ? { ...prev, name: editName.trim() } : null);
      }
      setEditTarget(null);
      refreshStudents();
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    // Delete check-ins first (in case there's no cascade set up in DB)
    await supabase.from('check_ins').delete().eq('student_id', deleteTarget.id);

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', deleteTarget.id);

    if (error) {
      toast.error('Failed to remove student.');
    } else {
      toast.success(`${deleteTarget.name} has been removed.`);
      if (selectedStudent?.id === deleteTarget.id) setSelectedStudent(null);
      setDeleteTarget(null);
      refreshStudents();
    }
    setDeleting(false);
  }

  if (selectedStudent) {
    return <div className="max-w-5xl mx-auto">
      <StudentDetailView key={selectedStudent.id} student={selectedStudent} onBack={() => setSelectedStudent(null)} />
    </div>;
  }

  return (
    <>
      <div className="p-5 lg:p-8 max-w-6xl mx-auto space-y-6">
        <header className="flex items-start justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-widest text-teal-700 mb-2">Counselor portal</p><h2 className="font-display text-3xl font-medium text-slate-800">Students</h2><p className="text-sm text-slate-500 mt-2">Keep track of check-ins and plan the next conversation.</p></div>
          <span className="flex items-center gap-2 rounded-full bg-white border border-stone-200 px-3 py-2 text-sm text-slate-600 shrink-0"><Users className="w-4 h-4" />{students.length}</span>
        </header>

        <section aria-label="Student filters" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {[{key: null, label: 'All students', count: students.length}, ...FILTER_ORDER.map(key => ({key, label: FILTER_META[key].label, count: students.filter(student => key === 'active-today' ? isToday(student.lastCheckIn) : student.alertLevel === (key === 'high' ? 'high' : 'medium')).length}))].map(item => (
              <button key={item.key ?? 'all'} type="button" aria-pressed={activeFilter === item.key} onClick={() => setFilter(item.key)} className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm transition-colors ${activeFilter === item.key ? 'bg-teal-700 border-teal-700 text-white' : 'bg-white border-stone-200 text-slate-600 hover:border-teal-300'}`}>
                {item.label}<span className={`rounded-full px-1.5 text-xs ${activeFilter === item.key ? 'bg-white/20 text-white' : 'bg-stone-100 text-slate-500'}`}>{item.count}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1"><Search aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input aria-label="Search students" placeholder="Search students by name" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} className="h-11 pl-10 rounded-xl bg-white border-stone-200" /></div>
            <label className="flex items-center gap-2 text-xs text-slate-500">Sort by<select aria-label="Sort students" value={sort} onChange={event => setSort(event.target.value)} className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm text-slate-700"><option value="priority">Priority first</option><option value="name">Name A–Z</option><option value="recent">Latest check-in</option></select></label>
          </div>
        </section>

        <div className="flex items-center justify-between gap-3"><p className="text-xs text-slate-500" role="status">Showing {filteredStudents.length} of {students.length} students</p>{(searchQuery || activeFilter) && <button className="text-xs font-medium text-teal-700 hover:underline" onClick={() => { setSearchQuery(''); setFilter(null); }}>Clear filters</button>}</div>
        {filteredStudents.length === 0 ? <Card className="p-10 items-center text-center rounded-2xl border-stone-200 gap-3"><Users className="w-8 h-8 text-teal-300" /><h3 className="font-semibold text-slate-700">{students.length ? 'No matching students' : 'No students yet'}</h3><p className="text-sm text-slate-500">{students.length ? 'Try another name or clear the filters.' : 'Students will appear here after they register.'}</p>{!!students.length && <Button variant="outline" onClick={() => { setSearchQuery(''); setFilter(null); }}>Clear filters</Button>}</Card> : (
          <div className="grid xl:grid-cols-2 gap-4">
            {filteredStudents.map(student => {
              const high = student.alertLevel === 'high';
              const medium = student.alertLevel === 'medium';
              return <article key={student.id} className="rounded-2xl border border-stone-200/80 bg-white overflow-hidden transition-shadow hover:shadow-sm">
                <button aria-label={`View ${student.name}`} onClick={() => setSelectedStudent(student)} className="w-full p-5 text-left focus-visible:outline-2 focus-visible:outline-teal-600 focus-visible:outline-offset-[-2px]">
                  <div className="flex items-start gap-3">
                    <span aria-hidden="true" className="h-11 w-11 shrink-0 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center font-semibold">{getInitials(student.name)}</span>
                    <div className="min-w-0 flex-1"><h3 className="font-semibold text-slate-800 break-words">{student.name}</h3><span className={`inline-block mt-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${high ? 'bg-rose-50 text-rose-700' : medium ? 'bg-amber-50 text-amber-700' : 'bg-stone-100 text-slate-600'}`}>{high ? 'High priority' : medium ? 'Follow-up' : 'No priority flag'}</span></div>
                    <ArrowUpRight aria-hidden="true" className="h-4 w-4 text-slate-400 shrink-0" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-5"><div><p className="text-xs text-slate-400">Last check-in</p><p className="text-sm font-medium text-slate-700 mt-1">{formatLastSeen(student.lastCheckIn)}</p></div><div><p className="text-xs text-slate-400">Total check-ins</p><p className="text-sm font-medium text-slate-700 mt-1">{student.checkIns.length}</p></div></div>
                </button>
                <div className="flex items-center justify-between gap-3 border-t border-stone-100 px-5 py-2"><p className="text-xs text-slate-500 leading-relaxed">{student.prioritySource}</p><div className="flex shrink-0"><button onClick={event => openEdit(student, event)} className="p-2.5 rounded-lg text-slate-400 hover:bg-stone-100 hover:text-slate-700" aria-label={`Edit ${student.name}`}><Pencil className="w-4 h-4" /></button><button onClick={event => openDelete(student, event)} className="p-2.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove ${student.name}`}><Trash2 className="w-4 h-4" /></button></div></div>
              </article>;
            })}
          </div>
        )}
      </div>

      {/* Edit name modal */}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setEditTarget(null)}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
              <h3 className="text-base font-semibold text-slate-800">Edit Student</h3>
              <button
                onClick={() => setEditTarget(null)}
                className="p-1.5 hover:bg-stone-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5">
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">Name</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                placeholder="Student name"
                className="rounded-xl border-stone-200 focus:border-teal-400 h-10"
                autoFocus
              />
            </div>
            <div className="px-6 pb-6 flex gap-2">
              <Button
                onClick={handleSaveEdit}
                disabled={saving || !editName.trim()}
                className="flex-1 bg-teal-600 hover:bg-teal-700 rounded-xl text-sm h-9"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
              <Button
                onClick={() => setEditTarget(null)}
                variant="outline"
                className="rounded-xl text-sm h-9 border-stone-200"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="p-6">
              <div className="w-11 h-11 bg-rose-50 rounded-2xl flex items-center justify-center mb-4">
                <Trash2 className="w-5 h-5 text-rose-500" />
              </div>
              <h3 className="text-base font-semibold text-slate-800 mb-1">Remove Student?</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                This will permanently delete{' '}
                <span className="font-medium text-slate-700">{deleteTarget.name}</span>'s account
                and all of their check-in history. This action cannot be undone.
              </p>
            </div>
            <div className="px-6 pb-6 flex gap-2">
              <Button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-rose-500 hover:bg-rose-600 rounded-xl text-sm h-9 text-white"
              >
                {deleting ? 'Removing…' : 'Remove Student'}
              </Button>
              <Button
                onClick={() => setDeleteTarget(null)}
                variant="outline"
                className="rounded-xl text-sm h-9 border-stone-200"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
