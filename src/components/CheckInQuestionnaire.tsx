import { useState, useEffect, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { ChevronLeft, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { hasCheckedInToday } from '../lib/streak';
import type { StudentOutletContext, CheckInAnswer } from './StudentDashboard';

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

export function CheckInQuestionnaire() {
  const { handleCheckInSubmit, checkIns } = useOutletContext<StudentOutletContext>();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Redirect if student already completed today's check-in
  useEffect(() => {
    if (hasCheckedInToday(checkIns)) {
      navigate('/student/home', { replace: true });
    }
  }, [checkIns, navigate]);

  useEffect(() => {
    supabase
      .from('questions')
      .select('*')
      .order('order', { ascending: true })
      .then(({ data }) => {
        setQuestions(data ?? []);
        setLoadingQuestions(false);
      });
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const current = questions[step];
  const isLast = step === questions.length - 1;
  const currentAnswer = current ? answers[current.id] : undefined;
  const isCrisisYes = !!current?.crisis && currentAnswer === 'Yes';
  const hasConcerningAnswers = questions.some((q) => q.crisis && answers[q.id] === 'Yes');

  function transition(newStep: number) {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
    timerRef.current = setTimeout(() => {
      setStep(newStep);
      setVisible(true);
    }, 150);
  }

  function selectYesNo(value: 'Yes' | 'No') {
    setAnswers((prev) => ({ ...prev, [current.id]: value }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    const formatted: CheckInAnswer[] = questions.map((q) => ({
      questionId: q.id,
      question: q.text,
      answer: answers[q.id] ?? '',
      crisis: q.crisis,
    }));
    await handleCheckInSubmit({ answers: formatted });
    setSubmitting(false);
  }

  function handleNext() {
    if (isLast) {
      handleSubmit();
    } else {
      transition(step + 1);
    }
  }

  // Continue button enablement
  const canContinue = (() => {
    if (!current) return false;
    if (current.type === 'yesno') return !!currentAnswer;
    // text
    if (current.optional) return true;
    return !!currentAnswer?.trim();
  })();

  if (loadingQuestions) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading questions…</div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-slate-500 text-sm text-center">
          No check-in questions have been set up yet. Please contact your counselor.
        </p>
        <Button
          onClick={() => navigate('/student/home')}
          variant="outline"
          className="rounded-xl"
        >
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col max-w-lg mx-auto">
      {/* Top bar: back arrow + step counter inline */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-3 flex-shrink-0">
        <button
          onClick={() => (step === 0 ? navigate('/student/home') : transition(step - 1))}
          className="p-1 -m-1 text-slate-500 hover:text-slate-700 transition-colors"
          aria-label={step === 0 ? 'Cancel' : 'Go back'}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-medium text-slate-500 tabular-nums">
          {step + 1} of {questions.length}
        </span>
      </div>

      {/* Segmented progress */}
      <div className="flex gap-1.5 px-5 pb-5 flex-shrink-0">
        {questions.map((_, i) => (
          <div
            key={i}
            className="flex-1 h-1 rounded-full bg-stone-200/70 overflow-hidden"
          >
            <div
              className={`h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500 rounded-full ${
                i <= step ? 'w-full' : 'w-0'
              }`}
            />
          </div>
        ))}
      </div>

      {/* Content */}
      <div
        className={`flex-1 flex flex-col px-6 pb-6 transition-opacity duration-150 ${visible ? 'opacity-100' : 'opacity-0'}`}
      >
        {/* Category label */}
        <div className="mb-4">
          <span className="text-[11px] font-semibold tracking-[0.2em] text-slate-400 uppercase">
            {current.category}
          </span>
        </div>

        {/* Question — editorial serif */}
        <h2 className="font-display text-3xl text-slate-800 leading-[1.2] tracking-tight">
          {current.text}
        </h2>

        <p className="text-sm text-slate-400 mt-3 leading-relaxed">
          No right answer. Take your time.
        </p>

        {/* Yes / No answers */}
        {current.type === 'yesno' && (
          <div className="mt-8 space-y-3">
            {(['Yes', 'No'] as const).map((option) => {
              const selected = currentAnswer === option;
              return (
                <button
                  key={option}
                  onClick={() => selectYesNo(option)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-base font-medium transition-all duration-200 ${
                    selected
                      ? 'border-teal-300 bg-teal-50 text-teal-800'
                      : 'border-stone-200/70 bg-white text-slate-700 hover:border-stone-300'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                      selected
                        ? 'bg-teal-500'
                        : 'bg-white border-2 border-stone-200'
                    }`}
                  >
                    {selected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                  </span>
                  <span className="text-left">{option}</span>
                </button>
              );
            })}

            {isCrisisYes && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex gap-3 mt-4">
                <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-rose-700">We hear you</p>
                  <p className="text-sm text-rose-600 mt-0.5 leading-relaxed">
                    Your counselor will be notified. Help is available — you are not alone.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Text answer */}
        {current.type === 'text' && (
          <div className="mt-8 space-y-4">
            <Textarea
              placeholder={current.optional ? 'Optional — leave blank if nothing to add' : 'Enter your response…'}
              value={currentAnswer ?? ''}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [current.id]: e.target.value }))}
              rows={5}
              className="resize-none rounded-2xl text-base bg-white border-stone-200 focus:border-teal-400 focus:ring-teal-100"
            />

            {hasConcerningAnswers && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-rose-600 leading-relaxed">
                  Based on your responses, your counselor will reach out to you soon. You are not alone.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Spacer pushes Continue to the bottom */}
        <div className="flex-1" />

        {/* Continue / Submit — pinned to bottom */}
        <Button
          onClick={handleNext}
          disabled={!canContinue || submitting}
          className="w-full h-13 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-base shadow-md disabled:opacity-50 disabled:from-stone-300 disabled:to-stone-300 mt-6"
        >
          {isLast ? (
            submitting ? 'Submitting…' : 'Submit Check-In'
          ) : (
            <span className="flex items-center justify-center gap-2">
              Continue <ArrowRight className="w-4 h-4" />
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
