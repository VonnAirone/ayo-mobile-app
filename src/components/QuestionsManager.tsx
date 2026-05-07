import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, AlertTriangle, X, Check, GripVertical } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface Question {
  id: string;
  text: string;
  category: string;
  category_icon: string;
  type: 'yesno' | 'text';
  optional: boolean;
  crisis: boolean;
  order: number;
}

const EMPTY_FORM: Omit<Question, 'id' | 'order'> = {
  text: '',
  category: '',
  category_icon: '',
  type: 'yesno',
  optional: false,
  crisis: false,
};

const CATEGORY_SUGGESTIONS = [
  'Home', 'Education & Work', 'Safety', 'Substance Use',
  'Relationships', 'Reproductive Health', 'Support', 'Mental Health', 'Final Note',
];

type ModalMode = 'add' | 'edit';

export function QuestionsManager() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ mode: ModalMode; question?: Question } | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, []);

  async function fetchQuestions() {
    setLoading(true);
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .order('order', { ascending: true });

    if (error) {
      toast.error('Failed to load questions.');
    } else {
      setQuestions(data ?? []);
    }
    setLoading(false);
  }

  function openAdd() {
    setForm(EMPTY_FORM);
    setModal({ mode: 'add' });
  }

  function openEdit(q: Question) {
    setForm({
      text: q.text,
      category: q.category,
      category_icon: q.category_icon,
      type: q.type,
      optional: q.optional,
      crisis: q.crisis,
    });
    setModal({ mode: 'edit', question: q });
  }

  function closeModal() {
    setModal(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave() {
    if (!form.text.trim()) {
      toast.error('Question text is required.');
      return;
    }
    setSaving(true);

    if (modal?.mode === 'add') {
      const nextOrder = questions.length > 0 ? Math.max(...questions.map((q) => q.order)) + 1 : 1;
      const { error } = await supabase.from('questions').insert({
        ...form,
        text: form.text.trim(),
        order: nextOrder,
      });
      if (error) {
        toast.error('Failed to add question.');
      } else {
        toast.success('Question added.');
        closeModal();
        fetchQuestions();
      }
    } else if (modal?.mode === 'edit' && modal.question) {
      const { error } = await supabase
        .from('questions')
        .update({ ...form, text: form.text.trim() })
        .eq('id', modal.question.id);
      if (error) {
        toast.error('Failed to update question.');
      } else {
        toast.success('Question updated.');
        closeModal();
        fetchQuestions();
      }
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('questions').delete().eq('id', deleteTarget.id);
    if (error) {
      toast.error('Failed to delete question.');
    } else {
      toast.success('Question deleted.');
      setDeleteTarget(null);
      fetchQuestions();
    }
    setDeleting(false);
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">Questions</h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Manage the questions shown to students during check-in
          </p>
        </div>
        <Button
          onClick={openAdd}
          className="bg-teal-600 hover:bg-teal-700 rounded-xl text-sm h-9 px-4 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add Question
        </Button>
      </div>

      {/* Questions list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-stone-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : questions.length === 0 ? (
        <Card className="p-12 text-center border border-stone-100 rounded-2xl">
          <p className="text-slate-400 text-sm">No questions yet. Add one to get started.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {questions.map((q, idx) => (
            <Card
              key={q.id}
              className="border border-stone-100 rounded-2xl shadow-sm overflow-hidden"
            >
              <div className="flex items-start gap-3 p-4">
                {/* Drag handle visual (order indicator) */}
                <div className="flex flex-col items-center gap-0.5 pt-1 flex-shrink-0 text-stone-300">
                  <GripVertical className="w-4 h-4" />
                  <span className="text-xs tabular-nums text-stone-300 leading-none">{idx + 1}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">
                      {q.category_icon} {q.category}
                    </span>
                    <span className="text-xs bg-stone-100 text-slate-500 px-2 py-0.5 rounded-full">
                      {q.type === 'yesno' ? 'Yes / No' : 'Text'}
                    </span>
                    {q.crisis && (
                      <span className="text-xs bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Crisis
                      </span>
                    )}
                    {q.optional && (
                      <span className="text-xs bg-stone-100 text-slate-400 px-2 py-0.5 rounded-full">
                        Optional
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 leading-snug">{q.text}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(q)}
                    className="p-2 rounded-lg hover:bg-stone-100 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label="Edit question"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(q)}
                    className="p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors"
                    aria-label="Delete question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
              <h3 className="text-base font-semibold text-slate-800">
                {modal.mode === 'add' ? 'Add Question' : 'Edit Question'}
              </h3>
              <button
                onClick={closeModal}
                className="p-1.5 hover:bg-stone-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-4">
              {/* Question text */}
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                  Question <span className="text-rose-400">*</span>
                </label>
                <Textarea
                  value={form.text}
                  onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
                  placeholder="Enter the question text…"
                  rows={3}
                  className="resize-none rounded-xl text-sm border-stone-200 focus:border-teal-400"
                />
              </div>

              {/* Category + icon in a row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-slate-600 mb-1.5 block">Category</label>
                  <Input
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    placeholder="e.g. Mental Health"
                    list="category-suggestions"
                    className="rounded-xl text-sm border-stone-200 focus:border-teal-400 h-9"
                  />
                  <datalist id="category-suggestions">
                    {CATEGORY_SUGGESTIONS.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1.5 block">Icon (emoji)</label>
                  <Input
                    value={form.category_icon}
                    onChange={(e) => setForm((f) => ({ ...f, category_icon: e.target.value }))}
                    placeholder="🧠"
                    className="rounded-xl text-sm border-stone-200 focus:border-teal-400 h-9 text-center text-lg"
                  />
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="text-xs font-medium text-slate-600 mb-2 block">Answer Type</label>
                <div className="flex gap-2">
                  {(['yesno', 'text'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setForm((f) => ({ ...f, type: t }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors ${
                        form.type === t
                          ? 'border-teal-500 bg-teal-50 text-teal-700'
                          : 'border-stone-200 text-slate-500 hover:border-stone-300'
                      }`}
                    >
                      {t === 'yesno' ? 'Yes / No' : 'Free Text'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="flex gap-3">
                <ToggleChip
                  label="Crisis question"
                  icon={<AlertTriangle className="w-3.5 h-3.5" />}
                  checked={form.crisis}
                  onChange={(v) => setForm((f) => ({ ...f, crisis: v }))}
                  activeClass="bg-rose-50 border-rose-300 text-rose-600"
                />
                <ToggleChip
                  label="Optional"
                  checked={form.optional}
                  onChange={(v) => setForm((f) => ({ ...f, optional: v }))}
                  activeClass="bg-stone-100 border-stone-300 text-slate-600"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-stone-100 flex gap-2">
              <Button
                onClick={handleSave}
                disabled={saving || !form.text.trim()}
                className="flex-1 bg-teal-600 hover:bg-teal-700 rounded-xl text-sm h-9"
              >
                {saving ? 'Saving…' : modal.mode === 'add' ? 'Add Question' : 'Save Changes'}
              </Button>
              <Button
                onClick={closeModal}
                variant="outline"
                className="rounded-xl text-sm h-9 border-stone-200"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="p-6">
              <div className="w-11 h-11 bg-rose-50 rounded-2xl flex items-center justify-center mb-4">
                <Trash2 className="w-5 h-5 text-rose-500" />
              </div>
              <h3 className="text-base font-semibold text-slate-800 mb-1">Delete Question?</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                This will permanently remove the question from the check-in form. Students who
                already answered it will not be affected.
              </p>
              <p className="mt-3 text-sm text-slate-700 bg-stone-50 border border-stone-100 rounded-xl px-3 py-2 italic">
                "{deleteTarget.text}"
              </p>
            </div>
            <div className="px-6 pb-6 flex gap-2">
              <Button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-rose-500 hover:bg-rose-600 rounded-xl text-sm h-9 text-white"
              >
                {deleting ? 'Deleting…' : 'Delete'}
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
    </div>
  );
}

interface ToggleChipProps {
  label: string;
  icon?: React.ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  activeClass: string;
}

function ToggleChip({ label, icon, checked, onChange, activeClass }: ToggleChipProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border-2 transition-colors ${
        checked ? activeClass : 'border-stone-200 text-slate-400 hover:border-stone-300'
      }`}
    >
      {checked ? <Check className="w-3.5 h-3.5" /> : icon ?? <span className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}
