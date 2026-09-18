import { useState, useEffect, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { ChevronLeft, Check, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { hasCheckedInToday } from '../lib/streak';
import {
  SCALE_OPTIONS,
  computeScore,
  moodFromPercentage,
  MOODS,
  type MoodKey,
} from '../lib/mood';
import type { StudentOutletContext, CheckInAnswer } from './StudentDashboard';

interface Question {
  id: string;
  text: string;
  category: string;
  category_icon: string;
  type: 'yesno' | 'text' | 'scaling';
  optional: boolean;
  crisis: boolean;
  order: number;
}

interface ReflectionQuestion {
  id: string;
  mood: MoodKey;
  text: string;
  order: number;
}

type Phase = 'questions' | 'result';

export function CheckInQuestionnaire() {
  const { handleCheckInSubmit, checkIns } = useOutletContext<StudentOutletContext>();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<Phase>('questions');
  const [result, setResult] = useState<{ mood: MoodKey; score: number; maxScore: number; percentage: number } | null>(null);
  const [reflections, setReflections] = useState<ReflectionQuestion[]>([]);
  const [reflectionAnswers, setReflectionAnswers] = useState<Record<string, string>>({});
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

  function transition(newStep: number) {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
    timerRef.current = setTimeout(() => {
      setStep(newStep);
      setVisible(true);
    }, 150);
  }

  function setAnswer(value: string) {
    setAnswers((prev) => ({ ...prev, [current.id]: value }));
  }

  async function goToResult() {
    const mainAnswers: CheckInAnswer[] = questions.map((q) => ({
      questionId: q.id,
      question: q.text,
      answer: answers[q.id] ?? '',
      ...(q.type === 'scaling'
        ? { kind: 'scale' as const, points: SCALE_OPTIONS.find((o) => o.label === answers[q.id])?.points }
        : {}),
    }));

    const { score, maxScore, percentage } = computeScore(mainAnswers);
    const mood = moodFromPercentage(percentage);

    const { data } = await supabase
      .from('reflection_questions')
      .select('*')
      .eq('mood', mood)
      .order('order', { ascending: true });

    // Fall back to the built-in prompts if none are configured.
    const reflectionList: ReflectionQuestion[] =
      data && data.length > 0
        ? (data as ReflectionQuestion[])
        : MOODS[mood].reflectionQuestions.map((text, i) => ({
            id: `default-${mood}-${i}`,
            mood,
            text,
            order: i,
          }));

    setResult({ mood, score, maxScore, percentage });
    setReflections(reflectionList);
    setPhase('result');
    setVisible(true);
  }

  async function handleFinish() {
    if (!result) return;
    setSubmitting(true);

    const mainAnswers: CheckInAnswer[] = questions.map((q) => ({
      questionId: q.id,
      question: q.text,
      answer: answers[q.id] ?? '',
      ...(q.type === 'scaling'
        ? { kind: 'scale' as const, points: SCALE_OPTIONS.find((o) => o.label === answers[q.id])?.points }
        : {}),
    }));

    const reflectionEntries: CheckInAnswer[] = reflections
      .map((r) => ({
        questionId: r.id,
        question: r.text,
        answer: (reflectionAnswers[r.id] ?? '').trim(),
        kind: 'reflection' as const,
      }))
      .filter((r) => r.answer.length > 0);

    await handleCheckInSubmit({
      answers: [...mainAnswers, ...reflectionEntries],
      mood: result.mood,
      score: result.score,
      maxScore: result.maxScore,
    });
    setSubmitting(false);
  }

  function handleNext() {
    if (isLast) {
      goToResult();
    } else {
      transition(step + 1);
    }
  }

  // Continue button enablement
  const canContinue = (() => {
    if (!current) return false;
    if (current.type === 'scaling' || current.type === 'yesno') return !!currentAnswer;
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
        <Button onClick={() => navigate('/student/home')} variant="outline" className="rounded-xl">
          Go Back
        </Button>
      </div>
    );
  }

  // ---- Result / reflection screen ----
  if (phase === 'result' && result) {
    const mood = MOODS[result.mood];
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col max-w-lg mx-auto">
        <div className="flex-1 flex flex-col px-6 pt-10 pb-6">
          {/* Mood result */}
          <div className="text-center">
            <div className="text-6xl mb-3" aria-hidden="true">{mood.emoji}</div>
            <span className="text-[11px] font-semibold tracking-[0.2em] text-slate-400 uppercase">
              Your Check-In
            </span>
            <h2 className="font-display text-3xl text-slate-800 leading-[1.2] tracking-tight mt-2">
              {mood.label}
            </h2>
            <p className="text-sm text-slate-500 mt-3 leading-relaxed">{mood.message}</p>
            <div className="inline-flex items-center gap-2 mt-4 px-3 py-1.5 rounded-full bg-white border border-stone-200/70">
              <span className="text-sm font-semibold text-teal-600 tabular-nums">{result.percentage}%</span>
              <span className="text-xs text-slate-400">well-being score</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 text-center mt-4">This is an initial questionnaire result, not a diagnosis. A counselor can review your responses and discuss support with you.</p>

          {/* Optional reflection questions */}
          {reflections.length > 0 && (
            <div className="mt-8 space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-700">A few optional reflections</h3>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Only if you'd like to share. You can leave these blank.
                </p>
              </div>
              {reflections.map((r) => (
                <div key={r.id}>
                  <label className="text-sm text-slate-600 leading-snug block mb-2">{r.text}</label>
                  <Textarea
                    value={reflectionAnswers[r.id] ?? ''}
                    onChange={(e) =>
                      setReflectionAnswers((prev) => ({ ...prev, [r.id]: e.target.value }))
                    }
                    placeholder="Optional — leave blank if nothing to add"
                    rows={3}
                    className="resize-none rounded-2xl text-base bg-white border-stone-200 focus:border-teal-400 focus:ring-teal-100"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex-1" />

          <Button
            onClick={handleFinish}
            disabled={submitting}
            className="w-full h-13 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-base shadow-md disabled:opacity-50 mt-8"
          >
            {submitting ? 'Saving…' : 'Finish Check-In'}
          </Button>
        </div>
      </div>
    );
  }

  // ---- Questions screen ----
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
          <div key={i} className="flex-1 h-1 rounded-full bg-stone-200/70 overflow-hidden">
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
          {current.type === 'scaling'
            ? 'Choose what feels most true for you lately.'
            : 'No right answer. Take your time.'}
        </p>

        {/* Scaling answers — Always … Never */}
        {current.type === 'scaling' && (
          <div className="mt-8 space-y-3">
            {SCALE_OPTIONS.map((option) => {
              const selected = currentAnswer === option.label;
              return (
                <button
                  key={option.label}
                  onClick={() => setAnswer(option.label)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-base font-medium transition-all duration-200 ${
                    selected
                      ? 'border-teal-300 bg-teal-50 text-teal-800'
                      : 'border-stone-200/70 bg-white text-slate-700 hover:border-stone-300'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                      selected ? 'bg-teal-500' : 'bg-white border-2 border-stone-200'
                    }`}
                  >
                    {selected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                  </span>
                  <span className="text-left flex-1">{option.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Yes / No answers (legacy support) */}
        {current.type === 'yesno' && (
          <div className="mt-8 space-y-3">
            {(['Yes', 'No'] as const).map((option) => {
              const selected = currentAnswer === option;
              return (
                <button
                  key={option}
                  onClick={() => setAnswer(option)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-base font-medium transition-all duration-200 ${
                    selected
                      ? 'border-teal-300 bg-teal-50 text-teal-800'
                      : 'border-stone-200/70 bg-white text-slate-700 hover:border-stone-300'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                      selected ? 'bg-teal-500' : 'bg-white border-2 border-stone-200'
                    }`}
                  >
                    {selected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                  </span>
                  <span className="text-left">{option}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Text answer (legacy support) */}
        {current.type === 'text' && (
          <div className="mt-8 space-y-4">
            <Textarea
              placeholder={current.optional ? 'Optional — leave blank if nothing to add' : 'Enter your response…'}
              value={currentAnswer ?? ''}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [current.id]: e.target.value }))}
              rows={5}
              className="resize-none rounded-2xl text-base bg-white border-stone-200 focus:border-teal-400 focus:ring-teal-100"
            />
          </div>
        )}

        {/* Spacer pushes Continue to the bottom */}
        <div className="flex-1" />

        {/* Continue / See result — pinned to bottom */}
        <Button
          onClick={handleNext}
          disabled={!canContinue || submitting}
          className="w-full h-13 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-base shadow-md disabled:opacity-50 disabled:from-stone-300 disabled:to-stone-300 mt-6"
        >
          {isLast ? (
            'See My Result'
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
