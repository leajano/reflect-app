'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ParticipantDetail {
  id: number;
  name: string;
  firstName: string;
  role: string;
  team: string;
  cycleName: string;
  cycleId: number;
  peerCount: number;
  selfDone: boolean;
  reportId: number | null;
  selfToken: string;
  peerTokens: string[];
}

export default function ParticipantPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [data, setData] = useState<ParticipantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingTokens, setGeneratingTokens] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const loadData = useCallback(() => {
    fetch(`/api/admin/participants/${params.id}`)
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
        setError('Failed to load participant.');
        setLoading(false);
      });
  }, [params.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function generatePeerTokens() {
    setGeneratingTokens(true);
    const res = await fetch(`/api/admin/participants/${params.id}/tokens`, {
      method: 'POST',
    });
    const d = await res.json();
    if (d.error) {
      setError(d.error);
    } else {
      loadData();
    }
    setGeneratingTokens(false);
  }

  async function generateReport() {
    setGeneratingReport(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/participants/${params.id}/report`, {
        method: 'POST',
      });
      const d = await res.json();
      if (d.error) {
        setError(d.error);
        setGeneratingReport(false);
      } else {
        router.push(`/admin/reports/${d.reportId}`);
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setGeneratingReport(false);
    }
  }

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-stone-400 text-sm">Loading...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const selfUrl = `${baseUrl}/review/${data.selfToken}`;

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="border-b border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/admin/dashboard" className="text-stone-400 hover:text-stone-600 text-sm">
            ← Dashboard
          </Link>
          <span className="text-stone-300">·</span>
          <span className="text-stone-900 text-sm font-medium">{data.name}</span>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        {/* Participant header */}
        <div className="bg-white border border-stone-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-light text-stone-900">{data.name}</h1>
              <p className="text-stone-500 mt-1">{data.role} · {data.team} · {data.cycleName}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-light text-stone-900">{data.peerCount}</div>
              <div className="text-xs text-stone-400">peer reviews</div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4 flex-wrap">
            <div className={`flex items-center gap-2 text-sm ${data.selfDone ? 'text-green-600' : 'text-stone-400'}`}>
              <div className={`w-2 h-2 rounded-full ${data.selfDone ? 'bg-green-500' : 'bg-stone-300'}`}></div>
              {data.selfDone ? 'Self-review complete' : 'Self-review pending'}
            </div>
            <div className={`flex items-center gap-2 text-sm ${data.peerCount >= 3 ? 'text-green-600' : 'text-stone-400'}`}>
              <div className={`w-2 h-2 rounded-full ${data.peerCount >= 3 ? 'bg-green-500' : 'bg-stone-300'}`}></div>
              {data.peerCount >= 3 ? 'Enough peer reviews' : `Need ${3 - data.peerCount} more peer review${3 - data.peerCount !== 1 ? 's' : ''}`}
            </div>
          </div>
        </div>

        {/* Self-review link */}
        <div className="bg-white border border-stone-200 rounded-lg p-6 space-y-4">
          <h2 className="text-sm font-medium text-stone-900">Self-review link</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={selfUrl}
              readOnly
              className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-stone-600 text-sm bg-stone-50 font-mono"
            />
            <button
              onClick={() => copyToClipboard(selfUrl, 'self')}
              className="px-4 py-2 border border-stone-200 rounded-lg text-sm text-stone-600 hover:bg-stone-50 transition-colors whitespace-nowrap"
            >
              {copied === 'self' ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-stone-400">
            Share this link directly with {data.firstName} for their self-assessment.
          </p>
        </div>

        {/* Peer review links */}
        <div className="bg-white border border-stone-200 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-stone-900">
              Peer review links ({data.peerTokens.length} / 8)
            </h2>
            {data.peerTokens.length < 8 && (
              <button
                onClick={generatePeerTokens}
                disabled={generatingTokens}
                className="text-sm text-stone-600 border border-stone-200 px-3 py-1.5 rounded-lg hover:bg-stone-50 transition-colors disabled:opacity-50"
              >
                {generatingTokens ? 'Generating...' : '+ Generate links'}
              </button>
            )}
          </div>

          {data.peerTokens.length === 0 ? (
            <p className="text-stone-400 text-sm">
              No peer review links yet. Generate links to share with colleagues.
            </p>
          ) : (
            <div className="space-y-2">
              {data.peerTokens.map((token, i) => {
                const url = `${baseUrl}/review/${token}`;
                return (
                  <div key={token} className="flex gap-2">
                    <input
                      type="text"
                      value={url}
                      readOnly
                      className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-stone-600 text-xs bg-stone-50 font-mono"
                    />
                    <button
                      onClick={() => copyToClipboard(url, `peer-${i}`)}
                      className="px-3 py-2 border border-stone-200 rounded-lg text-xs text-stone-600 hover:bg-stone-50 transition-colors whitespace-nowrap"
                    >
                      {copied === `peer-${i}` ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-xs text-stone-400">
            Each link is single-use and anonymous. Send one link per reviewer.
          </p>
        </div>

        {/* Report generation */}
        <div className="bg-white border border-stone-200 rounded-lg p-6 space-y-4">
          <h2 className="text-sm font-medium text-stone-900">AI Report</h2>

          {data.reportId ? (
            <div className="space-y-3">
              <p className="text-stone-500 text-sm">A report has been generated for this participant.</p>
              <div className="flex gap-3">
                <Link
                  href={`/admin/reports/${data.reportId}`}
                  className="px-4 py-2 bg-stone-900 text-stone-50 rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors"
                >
                  View report →
                </Link>
                <button
                  onClick={generateReport}
                  disabled={generatingReport || data.peerCount < 3}
                  className="px-4 py-2 border border-stone-200 text-stone-600 rounded-lg text-sm hover:bg-stone-50 transition-colors disabled:opacity-50"
                >
                  {generatingReport ? 'Regenerating...' : 'Regenerate'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-stone-500 text-sm">
                {data.peerCount < 3
                  ? `Need at least 3 peer reviews to generate a report. Currently have ${data.peerCount}.`
                  : 'Ready to generate an AI report based on all submissions.'}
              </p>
              <button
                onClick={generateReport}
                disabled={generatingReport || data.peerCount < 3}
                className="px-4 py-2 bg-stone-900 text-stone-50 rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatingReport ? 'Generating report...' : 'Generate report'}
              </button>
              {generatingReport && (
                <p className="text-xs text-stone-400">
                  This may take 15–30 seconds while Claude analyzes the responses...
                </p>
              )}
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
      </div>
    </div>
  );
}
