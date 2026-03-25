import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!checkAdminAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const participantId = parseInt(params.id);

  const participant = db.prepare(`
    SELECT p.*, c.name as cycle_name
    FROM participants p
    JOIN cycles c ON p.cycle_id = c.id
    WHERE p.id = ?
  `).get(participantId) as {
    id: number;
    name: string;
    role: string;
    team: string;
    cycle_id: number;
    cycle_name: string;
  } | undefined;

  if (!participant) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
  }

  // Check minimum peer reviews
  const peerCount = (db.prepare(`
    SELECT COUNT(*) as count FROM submissions
    WHERE participant_id = ? AND is_self_review = 0 AND submitted_at IS NOT NULL
  `).get(participantId) as { count: number }).count;

  if (peerCount < 3) {
    return NextResponse.json(
      { error: `Need at least 3 peer reviews. Currently have ${peerCount}.` },
      { status: 400 }
    );
  }

  // Gather all submissions and answers
  const submissions = db.prepare(`
    SELECT s.id, s.is_self_review
    FROM submissions s
    WHERE s.participant_id = ? AND s.submitted_at IS NOT NULL
  `).all(participantId) as Array<{ id: number; is_self_review: number }>;

  const allData: {
    type: string;
    answers: Array<{ question: string; answer: string | number }>;
  }[] = [];

  for (const submission of submissions) {
    const answers = db.prepare(`
      SELECT q.text, q.type, a.answer_text, a.answer_scale
      FROM answers a
      JOIN questions q ON a.question_id = q.id
      WHERE a.submission_id = ?
      ORDER BY q.order_index
    `).all(submission.id) as Array<{
      text: string;
      type: string;
      answer_text: string | null;
      answer_scale: number | null;
    }>;

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

  // Build prompt
  const prompt = `You are generating a peer review report for ${participant.name}, a ${participant.role} on the ${participant.team} team, for the ${participant.cycle_name} review cycle.

Here is their self-assessment:
${selfData.length > 0 ? selfData.map((d) => d.answers.map((a) => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n')).join('\n\n---\n\n') : 'No self-assessment submitted.'}

Here are ${peerData.length} anonymous peer reviews:
${peerData.map((d, i) => `--- Peer Review ${i + 1} ---\n${d.answers.map((a) => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n')}`).join('\n\n')}

Generate a comprehensive developmental feedback report as a JSON object. Follow these principles:
- Look for patterns across all peer responses, not individual responses
- Compare self-perception vs peer signals and note meaningful divergences where they exist
- Be specific, constructive, and direct — not generic HR speak
- Protect anonymity: never reference specific peer responses individually or say "one reviewer said"
- Frame everything as developmental and forward-looking, not punitive
- Be honest about areas for growth without being harsh
- For scale scores, calculate the average from peer responses

Return ONLY valid JSON matching this exact structure:
{
  "participant_name": "${participant.name}",
  "cycle_name": "${participant.cycle_name}",
  "generated_at": "${new Date().toISOString()}",
  "what_is_working": {
    "summary": "2-3 sentences on what peers consistently appreciate",
    "themes": ["specific theme 1", "specific theme 2", "specific theme 3"]
  },
  "blind_spots": {
    "summary": "2-3 sentences on growth areas, framed constructively",
    "themes": ["specific area 1", "specific area 2"]
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
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const reportContent = JSON.parse(jsonMatch[0]);

    // Save or update report
    const existingReport = db.prepare(
      'SELECT id FROM reports WHERE participant_id = ? AND cycle_id = ?'
    ).get(participantId, participant.cycle_id) as { id: number } | undefined;

    let reportId: number;
    if (existingReport) {
      db.prepare(
        "UPDATE reports SET content_json = ?, generated_at = datetime('now') WHERE id = ?"
      ).run(JSON.stringify(reportContent), existingReport.id);
      reportId = existingReport.id;
    } else {
      const result = db.prepare(
        'INSERT INTO reports (participant_id, cycle_id, content_json) VALUES (?, ?, ?)'
      ).run(participantId, participant.cycle_id, JSON.stringify(reportContent));
      reportId = result.lastInsertRowid as number;
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
