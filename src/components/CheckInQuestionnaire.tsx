import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Textarea } from './ui/textarea';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { StudentOutletContext, CheckInAnswer } from './StudentDashboard';

interface Question {
  id: string;
  text: string;
  type: 'single' | 'multi' | 'text';
  options?: string[];
  optional?: boolean;
}

const QUESTIONS: Question[] = [
  {
    id: 'mood',
    text: 'How are you feeling today?',
    type: 'single',
    options: ['😊 Great', '🙂 Good', '😐 Okay', '😔 Low', '😞 Really struggling'],
  },
  {
    id: 'sleep',
    text: 'How has your sleep been lately?',
    type: 'single',
    options: ['Very well rested', 'Fairly well', 'So-so', 'Poorly', 'Very poorly'],
  },
  {
    id: 'stress',
    text: "What's been stressing you out? Select all that apply.",
    type: 'multi',
    options: [
      'Academic pressure',
      'Social relationships',
      'Family issues',
      'Financial stress',
      'Health concerns',
      'Loneliness',
      'Future / career anxiety',
      'Nothing right now',
    ],
  },
  {
    id: 'confidence',
    text: "How are you managing what's on your plate?",
    type: 'single',
    options: ['Handling it well', 'Managing okay', 'Struggling a bit', 'Feeling overwhelmed'],
  },
  {
    id: 'message',
    text: 'Is there anything you would like your counselor to know?',
    type: 'text',
    optional: true,
  },
];

export function CheckInQuestionnaire() {
  const { handleCheckInSubmit } = useOutletContext<StudentOutletContext>();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  const current = QUESTIONS[step];
  const isLast = step === QUESTIONS.length - 1;
  const progress = ((step + 1) / QUESTIONS.length) * 100;

  const currentAnswer = answers[current.id];

  function isAnswered(): boolean {
    if (current.optional) return true;
    if (current.type === 'multi') return Array.isArray(currentAnswer) && currentAnswer.length > 0;
    return typeof currentAnswer === 'string' && currentAnswer.trim().length > 0;
  }

  function toggleMulti(option: string) {
    const prev = (answers[current.id] as string[]) ?? [];
    const next = prev.includes(option)
      ? prev.filter((o) => o !== option)
      : [...prev, option];
    setAnswers({ ...answers, [current.id]: next });
  }

  function selectSingle(option: string) {
    setAnswers({ ...answers, [current.id]: option });
  }

  async function handleSubmit() {
    setSubmitting(true);

    const formatted: CheckInAnswer[] = QUESTIONS.map((q) => {
      const raw = answers[q.id];
      const answer = Array.isArray(raw)
        ? raw.join(', ')
        : (raw as string | undefined) ?? '';
      return { questionId: q.id, question: q.text, answer };
    });

    await handleCheckInSubmit({ answers: formatted });
    setSubmitting(false);
  }

  const isConcerning =
    answers['mood'] === '😞 Really struggling' ||
    answers['confidence'] === 'Feeling overwhelmed';

  return (
    <div className="p-6 lg:p-8 max-w-2xl space-y-6">
      <div className="pt-2">
        <h2 className="text-2xl mb-1">Daily Check-In</h2>
        <p className="text-gray-600">Your answers are shared only with your counselor</p>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Question {step + 1} of {QUESTIONS.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <Card className="p-6 space-y-5">
        <h3 className="text-gray-900 text-lg leading-snug">{current.text}</h3>

        {current.type === 'single' && (
          <div className="space-y-2">
            {current.options!.map((option) => (
              <button
                key={option}
                onClick={() => selectSingle(option)}
                className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                  currentAnswer === option
                    ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 text-gray-700'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {current.type === 'multi' && (
          <div className="space-y-2">
            {current.options!.map((option) => {
              const selected = (answers[current.id] as string[] | undefined ?? []).includes(option);
              return (
                <button
                  key={option}
                  onClick={() => toggleMulti(option)}
                  className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                    selected
                      ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span className={`inline-block w-4 h-4 rounded border mr-3 align-middle transition-colors ${selected ? 'bg-blue-600 border-blue-600' : 'border-gray-400'}`} />
                  {option}
                </button>
              );
            })}
          </div>
        )}

        {current.type === 'text' && (
          <Textarea
            placeholder={current.optional ? 'Optional — leave blank if nothing to add' : 'Type your answer here...'}
            value={(currentAnswer as string) ?? ''}
            onChange={(e) => setAnswers({ ...answers, [current.id]: e.target.value })}
            rows={5}
            className="resize-none"
          />
        )}
      </Card>

      {isConcerning && isLast && (
        <Card className="p-4 bg-amber-50 border-amber-200">
          <p className="text-sm text-amber-900">
            It sounds like you're going through a tough time. Your counselor will review
            your responses and reach out. You're not alone.
          </p>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={step === 0 ? () => navigate('/student/home') : () => setStep(step - 1)}
          className="flex items-center space-x-1"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{step === 0 ? 'Cancel' : 'Back'}</span>
        </Button>

        {isLast ? (
          <Button
            onClick={handleSubmit}
            disabled={!isAnswered() || submitting}
            className="bg-blue-600 hover:bg-blue-700 flex items-center space-x-1"
          >
            <span>{submitting ? 'Submitting…' : 'Submit Check-In'}</span>
          </Button>
        ) : (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!isAnswered()}
            className="bg-blue-600 hover:bg-blue-700 flex items-center space-x-1"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
