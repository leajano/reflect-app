import { redirect } from 'next/navigation';
import Link from 'next/link';
import { checkAdminAuth } from '@/lib/auth';
import { queryOne, ensureDb } from '@/lib/db';
import type { ReportContent } from '@/types';
import DownloadPDFButton from './DownloadPDFButton';

function ScoreBar({ score, max = 5 }: { score: number; max?: number }) {
  const pct = (score / max) * 100;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-stone-100 rounded-full h-2">
        <div
          className="bg-stone-800 h-2 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-medium text-stone-700 w-8 text-right">
        {score.toFixed(1)}
      </span>
    </div>
  );
}

export default async function ReportPage({ params }: { params: { id: string } }) {
  if (!checkAdminAuth()) {
    redirect('/admin');
  }

  await ensureDb();
  const reportId = parseInt(params.id);

  const report = await queryOne<{
    id: number;
    participant_id: number;
    cycle_id: number;
    content_json: string;
    generated_at: string;
    participant_name: string;
    role: string;
    team: string;
    cycle_name: string;
  }>(
    `SELECT r.*, p.name as participant_name, p.role, p.team, p.id as participant_id, c.name as cycle_name
     FROM reports r
     JOIN participants p ON r.participant_id = p.id
     JOIN cycles c ON r.cycle_id = c.id
     WHERE r.id = $1`,
    [reportId]
  );

  if (!report) {
    redirect('/admin/dashboard');
  }

  const content = JSON.parse(report.content_json) as ReportContent;

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="border-b border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/admin/dashboard" className="text-stone-400 hover:text-stone-600 text-sm">
            ← Dashboard
          </Link>
          <span className="text-stone-300">·</span>
          <Link href={`/admin/participants/${report.participant_id}`} className="text-stone-400 hover:text-stone-600 text-sm">
            {report.participant_name}
          </Link>
          <span className="text-stone-300">·</span>
          <span className="text-stone-900 text-sm font-medium">Report</span>
          <DownloadPDFButton
            participantName={report.participant_name}
            role={report.role}
            team={report.team}
            cycleName={report.cycle_name}
            generatedAt={report.generated_at}
            content={content}
          />
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        {/* Header */}
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-widest mb-2">Reflect Report</p>
          <h1 className="text-3xl font-light text-stone-900">{report.participant_name}</h1>
          <p className="text-stone-500 mt-1">{report.role} · {report.team} · {report.cycle_name}</p>
          <p className="text-stone-400 text-xs mt-2">
            Generated {new Date(report.generated_at).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric'
            })}
          </p>
        </div>

        {/* Scale scores */}
        <div className="bg-white border border-stone-200 rounded-lg p-6 space-y-5">
          <h2 className="text-sm font-medium text-stone-900 uppercase tracking-wider">Peer Ratings</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm text-stone-600 mb-2">
                <span>Communication</span>
              </div>
              <ScoreBar score={content.scale_scores.communication} />
            </div>
            <div>
              <div className="flex justify-between text-sm text-stone-600 mb-2">
                <span>Reliability &amp; Follow-through</span>
              </div>
              <ScoreBar score={content.scale_scores.reliability} />
            </div>
            <div>
              <div className="flex justify-between text-sm text-stone-600 mb-2">
                <span>Collaboration</span>
              </div>
              <ScoreBar score={content.scale_scores.collaboration} />
            </div>
          </div>
          <p className="text-xs text-stone-400">Scale: 1–5</p>
        </div>

        {/* Overall narrative */}
        <div className="bg-white border border-stone-200 rounded-lg p-6 space-y-3">
          <h2 className="text-sm font-medium text-stone-900 uppercase tracking-wider">Overview</h2>
          <p className="text-stone-700 leading-relaxed">{content.overall_narrative}</p>
        </div>

        {/* What's working */}
        <div className="bg-white border border-stone-200 rounded-lg p-6 space-y-4">
          <h2 className="text-sm font-medium text-stone-900 uppercase tracking-wider">What&apos;s Working</h2>
          <p className="text-stone-700 leading-relaxed">{content.what_is_working.summary}</p>
          {content.what_is_working.themes.length > 0 && (
            <ul className="space-y-2">
              {content.what_is_working.themes.map((theme, i) => (
                <li key={i} className="flex gap-3 text-stone-600 text-sm">
                  <span className="text-stone-400 mt-0.5">→</span>
                  <span>{theme}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Blind spots */}
        <div className="bg-white border border-stone-200 rounded-lg p-6 space-y-4">
          <h2 className="text-sm font-medium text-stone-900 uppercase tracking-wider">Areas to Develop</h2>
          <p className="text-stone-700 leading-relaxed">{content.blind_spots.summary}</p>
          {content.blind_spots.themes.length > 0 && (
            <ul className="space-y-2">
              {content.blind_spots.themes.map((theme, i) => (
                <li key={i} className="flex gap-3 text-stone-600 text-sm">
                  <span className="text-stone-400 mt-0.5">→</span>
                  <span>{theme}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Start / Stop / Continue */}
        <div className="bg-white border border-stone-200 rounded-lg p-6 space-y-6">
          <h2 className="text-sm font-medium text-stone-900 uppercase tracking-wider">Start · Stop · Continue</h2>
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-green-700 uppercase tracking-wider">Start</h3>
              <ul className="space-y-2">
                {content.start_stop_continue.start.map((item, i) => (
                  <li key={i} className="text-stone-600 text-sm leading-relaxed">{item}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-red-600 uppercase tracking-wider">Stop</h3>
              <ul className="space-y-2">
                {content.start_stop_continue.stop.map((item, i) => (
                  <li key={i} className="text-stone-600 text-sm leading-relaxed">{item}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-blue-700 uppercase tracking-wider">Continue</h3>
              <ul className="space-y-2">
                {content.start_stop_continue.continue.map((item, i) => (
                  <li key={i} className="text-stone-600 text-sm leading-relaxed">{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Growth path */}
        <div className="bg-white border border-stone-200 rounded-lg p-6 space-y-4">
          <h2 className="text-sm font-medium text-stone-900 uppercase tracking-wider">Growth Path</h2>
          <p className="text-stone-700 leading-relaxed">{content.growth_path.summary}</p>
          {content.growth_path.suggested_focus && (
            <div className="border-l-2 border-stone-300 pl-4 mt-4">
              <p className="text-xs text-stone-400 uppercase tracking-wider mb-1">Suggested Focus</p>
              <p className="text-stone-700 text-sm">{content.growth_path.suggested_focus}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
