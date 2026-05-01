import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { query, queryOne, ensureDb } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!checkAdminAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureDb();
  const participantId = parseInt(params.id);

  const participant = await queryOne<{
    id: number;
    name: string;
    role: string;
    team: string;
    cycle_id: number;
    cycle_name: string;
  }>(
    `SELECT p.*, c.name as cycle_name
     FROM participants p
     JOIN cycles c ON p.cycle_id = c.id
     WHERE p.id = $1`,
    [participantId]
  );

  if (!participant) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
  }

  const peerCountRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM submissions
     WHERE participant_id = $1 AND is_self_review = 0 AND submitted_at IS NOT NULL`,
    [participantId]
  );
  const peerCount = parseInt(peerCountRow?.count ?? '0');

  if (peerCount < 3) {
    return NextResponse.json(
      { error: `Need at least 3 peer reviews. Currently have ${peerCount}.` },
      { status: 400 }
    );
  }

  const submissions = await query<{ id: number; is_self_review: number }>(
    `SELECT s.id, s.is_self_review
     FROM submissions s
     WHERE s.participant_id = $1 AND s.submitted_at IS NOT NULL`,
    [participantId]
  );

  const allData: {
    type: string;
    answers: Array<{ question: string; answer: string | number }>;
  }[] = [];

  for (const submission of submissions) {
    const answers = await query<{
      text: string;
      type: string;
      answer_text: string | null;
      answer_scale: number | null;
    }>(
      `SELECT q.text, q.type, a.answer_text, a.answer_scale
       FROM answers a
       JOIN questions q ON a.question_id = q.id
       WHERE a.submission_id = $1
       ORDER BY q.order_index`,
      [submission.id]
    );

    allData.push({
      type: submission.is_self_review ? 'self' : 'peer',
      answers: answers.map((a) => ({
        question: a.text.replace(/\[name\]/g, participant.name.split(' ')[0]),
        answer: a.type === 'scale' ? (a.answer_scale ?? 0) : (a.answer_text ?? ''),
      })),
    });
  }

  const selfData = allData.filter((d) => d.type === 'self');
  const peerData = allData.filter((d) => d.type === 'peer');

  const prompt = `You are generating a peer review report for ${participant.name}, a ${participant.role} on the ${participant.team} team, for the ${participant.cycle_name} review cycle.

Here is their self-assessment:
${selfData.length > 0 ? selfData.map((d) => d.answers.map((a) => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n')).join('\n\n---\n\n') : 'No self-assessment submitted.'}

Here are ${peerData.length} anonymous peer reviews:
${peerData.map((d, i) => `--- Peer Review ${i + 1} ---\n${d.answers.map((a) => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n')}`).join('\n\n')}

Generate a sharp, specific developmental feedback report as a JSON object. Follow these principles:
- Look for patterns across all peer responses, not individual responses
- Compare self-perception vs peer signals and explicitly name meaningful divergences — this is the most valuable insight
- Be specific, constructive, and direct — not generic HR speak
- Protect anonymity: never reference specific peer responses individually or say "one reviewer said"
- Frame everything as developmental and forward-looking, not punitive
- Be honest about areas for growth without being harsh
- For scale scores, calculate the average from peer responses
- Tone: direct, warm, and mentor-like — as if written by a trusted senior colleague

What's Working themes: each bullet must be a full insight sentence that names the specific behavior AND its impact on the team or work. Not a label — a real observation. Example: "Peers consistently rely on ${participant.name.split(' ')[0]} to follow through without being chased — this builds trust and reduces management overhead across the team."

Areas to Develop: write 3–4 bullets, each a specific behavioral observation with context about why it matters or what it is costing them. Lead the section with 1–2 sentences that explicitly name where self-perception and peer perception diverge — be direct about the gap without being harsh.

Return ONLY valid JSON matching this exact structure:
{
  "participant_name": "${participant.name}",
  "cycle_name": "${participant.cycle_name}",
  "generated_at": "${new Date().toISOString()}",
  "what_is_working": {
    "summary": "2-3 sentences on what peers consistently appreciate",
    "themes": ["Full insight sentence: behavior + impact on team", "Full insight sentence: behavior + impact on team", "Full insight sentence: behavior + impact on team"]
  },
  "blind_spots": {
    "summary": "Start by directly naming the gap between how this person sees themselves and how peers experience them (be specific, not vague). Then 1-2 sentences framing the growth areas constructively. Do not start with 'Where self-perception and peer signals diverge:' — that label is added automatically. Just write the content.",
    "themes": ["Specific behavioral observation with context about why it matters or what it costs", "Specific behavioral observation with context", "Specific behavioral observation with context", "Specific behavioral observation with context"]
  },
  "start_stop_continue": {
    "start": ["specific behavior to start 1", "specific behavior to start 2"],
    "stop": ["specific behavior to stop 1", "specific behavior to stop 2"],
    "continue": ["specific behavior to continue 1", "specific behavior to continue 2", "specific behavior to continue 3"]
  },
  "growth_path": {
    "summary": "2-3 sentences on overall trajectory and opportunity",
    "suggested_focus": "One clear, specific focus area for the next period"
  },
  "scale_scores": {
    "communication": <average of communication scale scores, 1 decimal>,
    "reliability": <average of reliability scale scores, 1 decimal>,
    "collaboration": <average of collaboration scale scores, 1 decimal>
  },
  "overall_narrative": "3-4 sentence narrative that ties everything together in a human, direct way"
}`;

  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');

    const reportContent = JSON.parse(jsonMatch[0]);

    const existingReport = await queryOne<{ id: number }>(
      'SELECT id FROM reports WHERE participant_id = $1 AND cycle_id = $2',
      [participantId, participant.cycle_id]
    );

    let reportId: number;
    if (existingReport) {
      await query(
        'UPDATE reports SET content_json = $1, generated_at = NOW() WHERE id = $2',
        [JSON.stringify(reportContent), existingReport.id]
      );
      reportId = existingReport.id;
    } else {
      const row = await queryOne<{ id: number }>(
        'INSERT INTO reports (participant_id, cycle_id, content_json) VALUES ($1, $2, $3) RETURNING id',
        [participantId, participant.cycle_id, JSON.stringify(reportContent)]
      );
      reportId = row!.id;
    }

    return NextResponse.json({ reportId, success: true });
  } catch (err) {
    console.error('Report generation error:', err);
    return NextResponse.json(
      { error: 'Failed to generate report. Check your Anthropic API key and try again.' },
      { status: 500 }
    );
  }
}
