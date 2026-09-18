import { useEffect, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Search, Users, Pencil, Trash2, X, AlertCircle, Heart, CheckCircle2, SlidersHorizontal, Check, ChevronDown } from 'lucide-react';
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
    label: 'Needs comfort',
    icon: Heart,
    iconClass: 'text-pink-500',
  },
};

const FILTER_ORDER: FilterKey[] = ['active-today', 'high', 'medium'];

function isToday(dateString: string): boolean {
  if (!dateString) return false;
  return Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24)) === 0;
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

  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    if (!filterOpen) return;
    function handlePointer(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (target && !target.closest('[data-filter-root]')) {
        setFilterOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setFilterOpen(false);
    }
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [filterOpen]);

  function setFilter(key: FilterKey | null) {
    const next = new URLSearchParams(searchParams);
    if (key) next.set('filter', key);
    else next.delete('filter');
    setSearchParams(next, { replace: true });
    setFilterOpen(false);
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
    .sort((a, b) => ALERT_ORDER[a.alertLevel] - ALERT_ORDER[b.alertLevel]);

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

  const listPanel = (
    <div className="flex flex-col h-full">
      {/* List header */}
      <div className="px-6 lg:px-4 pt-5 pb-3 border-b border-stone-100 flex-shrink-0">
        <h2 className="text-sm font-semibold text-slate-700 hidden lg:block mb-3">Students</h2>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search by name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-sm bg-stone-50 border-stone-200 focus:border-teal-300 rounded-xl h-9"
            />
          </div>

          <div className="relative flex-shrink-0" data-filter-root>
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={filterOpen}
              aria-label="Filter students"
              className={`flex items-center gap-1.5 h-9 px-3 rounded-xl border text-sm font-medium transition-colors ${
                activeFilter
                  ? 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100/70'
                  : 'bg-stone-50 border-stone-200 text-slate-600 hover:bg-stone-100'
              }`}
            >
              {activeFilter ? (() => {
                const { icon: FIcon, iconClass, label } = FILTER_META[activeFilter];
                return (
                  <>
                    <FIcon className={`w-3.5 h-3.5 ${iconClass}`} />
                    <span className="hidden sm:inline truncate max-w-[110px]">{label}</span>
                  </>
                );
              })() : (
                <>
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Filter</span>
                </>
              )}
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
            </button>

            {filterOpen && (
              <div
                role="listbox"
                aria-label="Filter students"
                className="absolute right-0 top-full mt-2 w-56 bg-white border border-stone-200 rounded-xl shadow-lg z-20 overflow-hidden"
              >
                <button
                  type="button"
                  role="option"
                  aria-selected={activeFilter === null}
                  onClick={() => setFilter(null)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-stone-50 transition-colors ${
                    activeFilter === null ? 'text-teal-700' : 'text-slate-600'
                  }`}
                >
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="flex-1">All students</span>
                  {activeFilter === null && <Check className="w-4 h-4 text-teal-600" />}
                </button>
                <div className="h-px bg-stone-100" />
                {FILTER_ORDER.map((key) => {
                  const { label, icon: OptIcon, iconClass } = FILTER_META[key];
                  const isActive = activeFilter === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => setFilter(key)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-stone-50 transition-colors ${
                        isActive ? 'text-teal-700' : 'text-slate-600'
                      }`}
                    >
                      <OptIcon className={`w-4 h-4 ${iconClass}`} />
                      <span className="flex-1">{label}</span>
                      {isActive && <Check className="w-4 h-4 text-teal-600" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        {filteredStudents.length > 0 && (
          <p className="text-xs text-slate-400 mt-2">
            {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
            {activeFilter && (
              <span className="text-slate-300"> · </span>
            )}
            {activeFilter && (
              <span className="text-slate-500">{FILTER_META[activeFilter].label.toLowerCase()}</span>
            )}
          </p>
        )}
      </div>

      {/* Student list */}
      <div className="flex-1 overflow-y-auto px-6 lg:px-3 py-3 space-y-1.5">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-slate-400 text-sm">No students found</p>
          </div>
        ) : (
          filteredStudents.map((student) => {
            const isSelected = selectedStudent?.id === student.id;
            const isHigh = student.alertLevel === 'high';
            const isMedium = student.alertLevel === 'medium';

            return (
              <div
                key={student.id}
                className={`group relative w-full text-left p-3.5 rounded-xl border transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'border-teal-300/70 bg-teal-50'
                    : 'border-transparent hover:bg-stone-50 hover:border-stone-200'
                }`}
                onClick={() => setSelectedStudent(student)}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar with alert indicator */}
                  <div className="relative flex-shrink-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold ${
                        isSelected
                          ? 'bg-teal-100 text-teal-700'
                          : isHigh
                          ? 'bg-rose-100 text-rose-600'
                          : isMedium
                          ? 'bg-pink-100 text-pink-600'
                          : 'bg-stone-100 text-slate-500'
                      }`}
                    >
                      {getInitials(student.name)}
                    </div>
                    <span className="text-xs text-slate-500">{student.prioritySource}</span>
                    {student.alertLevel !== 'none' && (
                      <span
                        className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                          isHigh ? 'bg-rose-400' : 'bg-pink-400'
                        }`}
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-teal-800' : 'text-slate-700'}`}>
                      {student.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">
                        {formatLastSeen(student.lastCheckIn)}
                      </span>
                      <span className="text-stone-300 text-xs">·</span>
                      <span className="text-xs text-slate-400">
                        {student.checkIns.length} check-in{student.checkIns.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons — visible on hover */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={(e) => openEdit(student, e)}
                      className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-slate-600 transition-colors"
                      aria-label={`Edit ${student.name}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => openDelete(student, e)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors"
                      aria-label={`Remove ${student.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  // Mobile: drill-in navigation
  if (selectedStudent) {
    return (
      <div className="lg:hidden">
        <StudentDetailView student={selectedStudent} onBack={() => setSelectedStudent(null)} />
      </div>
    );
  }

  return (
    <>
      {/* Mobile layout */}
      <div className="lg:hidden">
        <div className="px-6 pt-6 pb-3">
          <h2 className="font-display text-3xl font-medium text-slate-800 tracking-tight">Students</h2>
          <p className="text-slate-400 text-sm mt-0.5">View and manage student check-ins</p>
        </div>
        {listPanel}
      </div>

      {/* Desktop layout: master-detail */}
      <div className="hidden lg:flex h-full min-h-screen p-6 lg:p-8 max-w-6xl mx-auto">
        {/* Left panel: student list */}
        <div className="w-72 border-r border-stone-100 bg-white flex-shrink-0 flex flex-col">
          {listPanel}
        </div>

        {/* Right panel: detail view */}
        <div className="flex-1 overflow-y-auto bg-stone-50">
          {selectedStudent ? (
            <StudentDetailView
              student={selectedStudent}
              onBack={() => setSelectedStudent(null)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-600 text-sm font-medium">Select a student</p>
              <p className="text-slate-400 text-xs mt-1">
                Choose a student from the list to view their check-in history
              </p>
            </div>
          )}
        </div>
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
