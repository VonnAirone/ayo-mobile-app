import { useState, useEffect, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { ChevronLeft, Check, AlertCircle } from 'lucide-react';
import type { StudentOutletContext, CheckInAnswer } from './StudentDashboard';

interface Question {
  id: string;
  text: string;
  category: string;
  categoryIcon: string;
  type: 'yesno' | 'text';
  optional?: boolean;
  crisis?: boolean;
}

const QUESTIONS: Question[] = [
  { id: 'home_abuse', text: 'Have you experienced physical harm or abuse in your home?', category: 'Home', categoryIcon: '🏠', type: 'yesno', crisis: true },
  { id: 'home_runaway', text: 'Have you ever thought about running away or leaving your home?', category: 'Home', categoryIcon: '🏠', type: 'yesno' },
  { id: 'edu_bullying', text: 'Have you experienced bullying or physical harm at school or at work?', category: 'Education & Work', categoryIcon: '📚', type: 'yesno', crisis: true },
  { id: 'safety_suicidal_thoughts', text: 'Have you ever seriously thought about ending your life?', category: 'Safety', categoryIcon: '🛡️', type: 'yesno', crisis: true },
  { id: 'substance_smoke', text: 'Do you smoke?', category: 'Substance Use', categoryIcon: '🚭', type: 'yesno' },
  { id: 'substance_alcohol', text: 'Do you drink alcohol?', category: 'Substance Use', categoryIcon: '🚭', type: 'yesno' },
  { id: 'substance_drugs', text: 'Have you seen or been exposed to illegal drugs?', category: 'Substance Use', categoryIcon: '🚭', type: 'yesno' },
  { id: 'repro_relationship', text: 'Have you ever had a boyfriend or girlfriend?', category: 'Relationships', categoryIcon: '💙', type: 'yesno' },
  { id: 'repro_sex', text: 'Have you ever had sexual intercourse?', category: 'Reproductive Health', categoryIcon: '💙', type: 'yesno' },
  { id: 'repro_forced', text: 'Have you ever been forced to have sex?', category: 'Reproductive Health', categoryIcon: '💙', type: 'yesno', crisis: true },
  { id: 'repro_pregnancy', text: 'Have you ever been pregnant or gotten someone pregnant?', category: 'Reproductive Health', categoryIcon: '💙', type: 'yesno' },
  { id: 'counseling', text: 'Would you like to seek counseling or consultation to help you?', category: 'Support', categoryIcon: '🤝', type: 'yesno' },
  { id: 'mh_wished_dead', text: 'Have you wished you were dead in the past few weeks?', category: 'Mental Health', categoryIcon: '🧠', type: 'yesno', crisis: true },
  { id: 'mh_family_better_off', text: 'Have you felt that you and your family would be better off if you were gone in the past few weeks?', category: 'Mental Health', categoryIcon: '🧠', type: 'yesno', crisis: true },
  { id: 'mh_thoughts_killing', text: 'Have you had thoughts about killing yourself in the past few weeks?', category: 'Mental Health', categoryIcon: '🧠', type: 'yesno', crisis: true },
  { id: 'mh_tried_kill', text: 'Have you ever tried to kill yourself?', category: 'Mental Health', categoryIcon: '🧠', type: 'yesno', crisis: true },
  { id: 'mh_current_thoughts', text: 'Are you having thoughts of killing yourself right now?', category: 'Mental Health', categoryIcon: '🧠', type: 'yesno', crisis: true },
  { id: 'message', text: 'Is there anything you would like your counselor to know?', category: 'Final Note', categoryIcon: '✉️', type: 'text', optional: true },
];

export function CheckInQuestionnaire() {
  const { handleCheckInSubmit } = useOutletContext<StudentOutletContext>();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = QUESTIONS[step];
  const isLast = step === QUESTIONS.length - 1;
  const currentAnswer = answers[current.id];
  const isCrisisYes = !!current.crisis && currentAnswer === 'Yes';
  const hasConcerningAnswers = QUESTIONS.some((q) => q.crisis && answers[q.id] === 'Yes');

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

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
    const formatted: CheckInAnswer[] = QUESTIONS.map((q) => ({
      questionId: q.id,
      question: q.text,
      answer: answers[q.id] ?? '',
    }));
    await handleCheckInSubmit({ answers: formatted });
    setSubmitting(false);
  }

  const progressPct = QUESTIONS.length > 1 ? (step / (QUESTIONS.length - 1)) * 100 : 0;

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
          {step + 1} / {QUESTIONS.length}
        </span>
      </div>

      {/* Content */}
      <div
        className={`flex-1 flex flex-col px-6 pb-10 transition-opacity duration-150 ${visible ? 'opacity-100' : 'opacity-0'}`}
      >
        {/* Category badge */}
        <div className="mt-2 mb-8">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 bg-teal-50 px-3 py-1.5 rounded-full">
            <span aria-hidden="true">{current.categoryIcon}</span>
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

        {/* Text answer (final step) */}
        {current.type === 'text' && (
          <div className="space-y-4 mt-auto">
            <Textarea
              placeholder="Optional — leave blank if nothing to add"
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
              disabled={submitting}
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
