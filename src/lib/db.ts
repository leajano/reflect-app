import { Pool } from 'pg';

// Pool is created lazily so this module can be imported at build time
// without DATABASE_URL being set.
const globalForPg = globalThis as unknown as { _reflectPool: Pool | undefined };

let _productionPool: Pool | undefined;

function createPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  const isLocal =
    process.env.DATABASE_URL.includes('localhost') ||
    process.env.DATABASE_URL.includes('127.0.0.1');
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

// Exported for routes that need a client for transactions
export function getPool(): Pool {
  if (process.env.NODE_ENV !== 'production') {
    globalForPg._reflectPool ??= createPool();
    return globalForPg._reflectPool;
  }
  _productionPool ??= createPool();
  return _productionPool;
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

export async function query<T extends object = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const { rows } = await getPool().query(text, params);
  return rows as T[];
}

export async function queryOne<T extends object = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T | undefined> {
  const rows = await query<T>(text, params);
  return rows[0];
}

// ---------------------------------------------------------------------------
// Schema init (idempotent — called once per serverless instance)
// ---------------------------------------------------------------------------

let _initPromise: Promise<void> | null = null;

export function ensureDb(): Promise<void> {
  if (!_initPromise) {
    _initPromise = initializeSchema();
  }
  return _initPromise;
}

async function initializeSchema(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS cycles (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'closed')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS participants (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      team TEXT NOT NULL CHECK(team IN ('Design', 'Account', 'Auctions', 'Dev')),
      cycle_id INTEGER NOT NULL REFERENCES cycles(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      text TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('self', 'peer')),
      type TEXT NOT NULL CHECK(type IN ('open', 'scale')),
      order_index INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id SERIAL PRIMARY KEY,
      participant_id INTEGER NOT NULL REFERENCES participants(id),
      cycle_id INTEGER NOT NULL REFERENCES cycles(id),
      is_self_review SMALLINT NOT NULL DEFAULT 0,
      token TEXT NOT NULL UNIQUE,
      submitted_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS answers (
      id SERIAL PRIMARY KEY,
      submission_id INTEGER NOT NULL REFERENCES submissions(id),
      question_id INTEGER NOT NULL REFERENCES questions(id),
      answer_text TEXT,
      answer_scale INTEGER
    );

    CREATE TABLE IF NOT EXISTS reports (
      id SERIAL PRIMARY KEY,
      participant_id INTEGER NOT NULL REFERENCES participants(id),
      cycle_id INTEGER NOT NULL REFERENCES cycles(id),
      content_json TEXT NOT NULL,
      generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const { rows } = await getPool().query('SELECT COUNT(*) as count FROM questions');
  if (parseInt(rows[0].count) === 0) {
    await seedQuestions();
  }
}

async function seedQuestions(): Promise<void> {
  const allQuestions: [string, string, string, number][] = [
    ['What are you most proud of in the last 6 months?', 'self', 'open', 1],
    ['Where have you grown the most?', 'self', 'open', 2],
    ["What's one thing you wish you did differently?", 'self', 'open', 3],
    ['What do you need more of to do your best work?', 'self', 'open', 4],
    ['Where do you feel stuck or limited?', 'self', 'open', 5],
    ['How would you describe your working style to someone new?', 'self', 'open', 6],
    ["What's one thing you'd like to be known for on this team?", 'self', 'open', 7],
    ['What does [name] do that makes the team better?', 'peer', 'open', 1],
    ['Describe a time [name] handled something difficult well.', 'peer', 'open', 2],
    ["What's one thing [name] could do differently that would make them more effective?", 'peer', 'open', 3],
    ["On a scale of 1–5, how would you rate [name]'s communication?", 'peer', 'scale', 4],
    ["On a scale of 1–5, how would you rate [name]'s reliability and follow-through?", 'peer', 'scale', 5],
    ["On a scale of 1–5, how would you rate [name]'s collaboration?", 'peer', 'scale', 6],
    ['What should [name] START doing?', 'peer', 'open', 7],
    ['What should [name] STOP doing?', 'peer', 'open', 8],
    ['What should [name] CONTINUE doing?', 'peer', 'open', 9],
    ['Is there anything else you want to share about working with [name]?', 'peer', 'open', 10],
  ];

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    for (const [text, category, type, order_index] of allQuestions) {
      await client.query(
        'INSERT INTO questions (text, category, type, order_index) VALUES ($1, $2, $3, $4)',
        [text, category, type, order_index]
      );
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
