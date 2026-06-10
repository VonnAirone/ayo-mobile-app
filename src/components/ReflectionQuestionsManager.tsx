import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { supabase } from '../lib/supabase';
import { MOODS, type MoodKey } from '../lib/mood';
import { toast } from 'sonner';

interface ReflectionQuestion {
  id: string;
  mood: MoodKey;
  text: string;
  order: number;
}

const MOOD_ORDER: MoodKey[] = ['happy', 'okay', 'struggling'];

type ModalState = { mood: MoodKey; question?: ReflectionQuestion } | null;

export function ReflectionQuestionsManager() {
  const [questions, setQuestions] = useState<ReflectionQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ReflectionQuestion | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, []);

  async function fetchQuestions() {
    setLoading(true);
    const { data, error } = await supabase
      .from('reflection_questions')
      .select('*')
      .order('mood', { ascending: true })
      .order('order', { ascending: true });

    if (error) {
      toast.error('Failed to load reflection questions.');
    } else {
      setQuestions((data ?? []) as ReflectionQuestion[]);
    }
    setLoading(false);
  }

  function openAdd(mood: MoodKey) {
    setText('');
    setModal({ mood });
  }

  function openEdit(q: ReflectionQuestion) {
    setText(q.text);
    setModal({ mood: q.mood, question: q });
  }

  function closeModal() {
    setModal(null);
    setText('');
  }

  async function handleSave() {
    if (!text.trim() || !modal) return;
    setSaving(true);

    if (modal.question) {
      const { error } = await supabase
        .from('reflection_questions')
        .update({ text: text.trim() })
        .eq('id', modal.question.id);
      if (error) toast.error('Failed to update question.');
      else {
        toast.success('Question updated.');
        closeModal();
        fetchQuestions();
      }
    } else {
      const inMood = questions.filter((q) => q.mood === modal.mood);
      const nextOrder = inMood.length > 0 ? Math.max(...inMood.map((q) => q.order)) + 1 : 1;
      const { error } = await supabase.from('reflection_questions').insert({
        mood: modal.mood,
        text: text.trim(),
        order: nextOrder,
      });
      if (error) toast.error('Failed to add question.');
      else {
        toast.success('Question added.');
        closeModal();
        fetchQuestions();
      }
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase
      .from('reflection_questions')
      .delete()
      .eq('id', deleteTarget.id);
    if (error) toast.error('Failed to delete question.');
    else {
      toast.success('Question deleted.');
      setDeleteTarget(null);
      fetchQuestions();
    }
    setDeleting(false);
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="font-display text-3xl font-medium text-slate-800 tracking-tight">Reflection Questions</h2>
        <p className="text-slate-400 text-sm mt-0.5 max-w-xl leading-relaxed">
          Optional follow-up prompts shown to a student after their check-in, based on the mood their
          score falls into.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-stone-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {MOOD_ORDER.map((mood) => {
            const moodInfo = MOODS[mood];
            const items = questions.filter((q) => q.mood === mood);
            return (
              <Card key={mood} className="border border-stone-200/70 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 bg-stone-50/60">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl" aria-hidden="true">{moodInfo.emoji}</span>
                    <span className="text-sm font-semibold text-slate-700">{moodInfo.label}</span>
                  </div>
                  <Button
                    onClick={() => openAdd(mood)}
                    className="bg-teal-600 hover:bg-teal-700 rounded-xl text-xs h-8 px-3 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </Button>
                </div>

                {items.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-6">No reflection questions yet.</p>
                ) : (
                  <ul className="divide-y divide-stone-100">
                    {items.map((q) => (
                      <li key={q.id} className="flex items-start gap-3 px-5 py-3.5">
                        <p className="text-sm text-slate-700 leading-snug flex-1">{q.text}</p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => openEdit(q)}
                            className="p-2 rounded-lg hover:bg-stone-100 text-slate-400 hover:text-slate-600 transition-colors"
                            aria-label="Edit reflection question"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(q)}
                            className="p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors"
                            aria-label="Delete reflection question"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
              <h3 className="text-base font-semibold text-slate-800">
                {modal.question ? 'Edit' : 'Add'} Reflection · {MOODS[modal.mood].label}
              </h3>
              <button
                onClick={closeModal}
                className="p-1.5 hover:bg-stone-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5">
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                Question <span className="text-rose-400">*</span>
              </label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter the reflection question…"
                rows={3}
                className="resize-none rounded-xl text-sm border-stone-200 focus:border-teal-400"
              />
            </div>
            <div className="px-6 py-4 border-t border-stone-100 flex gap-2">
              <Button
                onClick={handleSave}
                disabled={saving || !text.trim()}
                className="flex-1 bg-teal-600 hover:bg-teal-700 rounded-xl text-sm h-9"
              >
                {saving ? 'Saving…' : modal.question ? 'Save Changes' : 'Add Question'}
              </Button>
              <Button onClick={closeModal} variant="outline" className="rounded-xl text-sm h-9 border-stone-200">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="p-6">
              <div className="w-11 h-11 bg-rose-50 rounded-2xl flex items-center justify-center mb-4">
                <Trash2 className="w-5 h-5 text-rose-500" />
              </div>
              <h3 className="text-base font-semibold text-slate-800 mb-1">Delete Reflection Question?</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                This prompt will no longer be shown to students with this mood.
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
