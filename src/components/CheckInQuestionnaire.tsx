import { useState, useEffect, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { ChevronLeft, Check, AlertCircle } from 'lucide-react';
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
    if (timerRef.current) clearTimeout(timerRef.current);
    setAnswers((prev) => ({ ...prev, [current.id]: value }));

    const willCrisis = current.crisis && value === 'Yes';
    if (!willCrisis && !isLast) {
      timerRef.current = setTimeout(() => transition(step + 1), 350);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    const formatted: CheckInAnswer[] = questions.map((q) => ({
      questionId: q.id,
      question: q.text,
      answer: answers[q.id] ?? '',
    }));
    await handleCheckInSubmit({ answers: formatted });
    setSubmitting(false);
  }

  const progressPct = questions.length > 1 ? (step / (questions.length - 1)) * 100 : 0;

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
      {/* Progress strip */}
      <div className="w-full h-1 bg-stone-200 flex-shrink-0">
        <div
          className="h-1 bg-teal-500 transition-all duration-300 rounded-r-full"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Nav bar */}
      <div className="flex items-center justify-between px-5 py-3.5 flex-shrink-0">
        <button
          onClick={() => (step === 0 ? navigate('/student/home') : transition(step - 1))}
          className="flex items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label={step === 0 ? 'Cancel' : 'Go back'}
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm">{step === 0 ? 'Cancel' : 'Back'}</span>
        </button>
        <span className="text-xs text-slate-400 tabular-nums bg-stone-200 px-2.5 py-1 rounded-full">
          {step + 1} / {questions.length}
        </span>
      </div>

      {/* Content */}
      <div
        className={`flex-1 flex flex-col px-6 pb-10 transition-opacity duration-150 ${visible ? 'opacity-100' : 'opacity-0'}`}
      >
        {/* Category badge */}
        <div className="mt-2 mb-8">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 bg-teal-50 px-3 py-1.5 rounded-full">
            <span aria-hidden="true">{current.category_icon}</span>
            <span>{current.category}</span>
          </span>
        </div>

        {/* Question */}
        <h2 className="text-xl font-semibold text-slate-800 leading-snug">
          {current.text}
        </h2>

        <p className="text-xs text-slate-400 mt-3 mb-10 leading-relaxed">
          Your answers are private and shared only with your counselor.
        </p>

        {/* Yes / No answers */}
        {current.type === 'yesno' && (
          <div className="space-y-3 mt-auto">
            {isCrisisYes && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex gap-3 mb-4">
                <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-rose-700">We hear you</p>
                  <p className="text-sm text-rose-600 mt-0.5 leading-relaxed">
                    Your counselor will be notified. Help is available — you are not alone.
                  </p>
                </div>
              </div>
            )}

            {(['Yes', 'No'] as const).map((option) => {
              const selected = currentAnswer === option;
              return (
                <button
                  key={option}
                  onClick={() => selectYesNo(option)}
                  className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 text-base font-medium transition-all duration-200 ${
                    selected
                      ? option === 'Yes'
                        ? 'border-teal-500 bg-teal-500 text-white shadow-sm'
                        : 'border-stone-300 bg-stone-100 text-slate-600 shadow-sm'
                      : 'border-stone-200 bg-white text-slate-600 hover:border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  {option}
                  {selected && <Check className="w-5 h-5" />}
                </button>
              );
            })}

            {isCrisisYes && !isLast && (
              <Button
                onClick={() => transition(step + 1)}
                className="w-full h-13 rounded-2xl bg-teal-600 hover:bg-teal-700 text-base mt-2 shadow-sm"
              >
                Continue
              </Button>
            )}

            {isLast && currentAnswer && (
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full h-13 rounded-2xl bg-teal-600 hover:bg-teal-700 text-base mt-2 shadow-sm"
              >
                {submitting ? 'Submitting…' : 'Submit Check-In'}
              </Button>
            )}
          </div>
        )}

        {/* Text answer */}
        {current.type === 'text' && (
          <div className="space-y-4 mt-auto">
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

            <Button
              onClick={handleSubmit}
              disabled={submitting || (!current.optional && !currentAnswer?.trim())}
              className="w-full h-13 rounded-2xl bg-teal-600 hover:bg-teal-700 text-base shadow-sm"
            >
              {submitting ? 'Submitting…' : 'Submit Check-In'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
