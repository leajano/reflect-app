'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Question {
  id: number;
  text: string;
  type: 'open' | 'scale';
  category: 'self' | 'peer';
}

interface ReviewData {
  participantName: string;
  firstName: string;
  isSelf: boolean;
  questions: Question[];
  submissionId: number;
  alreadySubmitted: boolean;
}

export default function ReviewPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const { token } = params;

  const [data, setData] = useState<ReviewData | null>(null);
  const [answers, setAnswers] = useState<Record<number, string | number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/review/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
        } else {
          setData(d);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load review form.');
        setLoading(false);
      });
  }, [token]);

  function handleAnswer(questionId: number, value: string | number) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/review/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, answers }),
      });

      const result = await res.json();
      if (result.success) {
        router.push('/review/thanks');
      } else {
        setError(result.error || 'Submission failed. Please try again.');
        setSubmitting(false);
      }
    } catch {
      setError('Network error. Please try again.');
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-stone-400 text-sm">Loading...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-xl font-medium text-stone-900">This link isn&apos;t valid</h1>
          <p className="text-stone-500 text-sm">{error}</p>
        </div>
      </main>
    );
  }

  if (!data) return null;

  if (data.alreadySubmitted) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-xl font-medium text-stone-900">Already submitted</h1>
          <p className="text-stone-500 text-sm">
            This review has already been completed. Each link can only be used once.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-12 space-y-2">
          <p className="text-stone-400 text-xs uppercase tracking-widest font-medium">reflect</p>
          <h1 className="text-2xl font-light text-stone-900">
            {data.isSelf
              ? 'Self-assessment'
              : `Reviewing ${data.firstName}`}
          </h1>
          {!data.isSelf && (
            <p className="text-stone-500 text-sm">
              Your responses are anonymous. Be honest and kind.
            </p>
          )}
          {data.isSelf && (
            <p className="text-stone-500 text-sm">
              Take your time. There are no wrong answers.
            </p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-10">
          {data.questions.map((question, index) => {
            const questionText = question.text.replace(/\[name\]/g, data.firstName);

            return (
              <div key={question.id} className="space-y-3">
                <label className="block">
                  <span className="text-xs text-stone-400 font-medium uppercase tracking-wider">
                    {index + 1} of {data.questions.length}
                  </span>
                  <p className="text-stone-900 text-lg mt-1 leading-snug font-light">
                    {questionText}
                  </p>
                </label>

                {question.type === 'open' ? (
                  <textarea
                    rows={4}
                    value={(answers[question.id] as string) || ''}
                    onChange={(e) => handleAnswer(question.id, e.target.value)}
                    placeholder="Your thoughts..."
                    className="w-full border border-stone-200 rounded-lg px-4 py-3 text-stone-900 placeholder-stone-300 focus:outline-none focus:border-stone-400 resize-none bg-white text-sm leading-relaxed"
                  />
                ) : (
                  <div className="flex gap-3">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleAnswer(question.id, val)}
                        className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-all ${
                          answers[question.id] === val
                            ? 'bg-stone-900 text-stone-50 border-stone-900'
                            : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Submit */}
          <div className="pt-6 border-t border-stone-200">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-stone-900 text-stone-50 rounded-lg font-medium hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit review'}
            </button>
            <p className="text-center text-stone-400 text-xs mt-3">
              Once submitted, you won&apos;t be able to edit your responses.
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}
