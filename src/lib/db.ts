import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'reflect.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    initializeSchema(_db);
  }
  return _db;
}

function initializeSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cycles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'closed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      team TEXT NOT NULL CHECK(team IN ('Design', 'Account', 'Auctions', 'Dev')),
      cycle_id INTEGER NOT NULL REFERENCES cycles(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('self', 'peer')),
      type TEXT NOT NULL CHECK(type IN ('open', 'scale')),
      order_index INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      participant_id INTEGER NOT NULL REFERENCES participants(id),
      cycle_id INTEGER NOT NULL REFERENCES cycles(id),
      is_self_review INTEGER NOT NULL DEFAULT 0,
      token TEXT NOT NULL UNIQUE,
      submitted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER NOT NULL REFERENCES submissions(id),
      question_id INTEGER NOT NULL REFERENCES questions(id),
      answer_text TEXT,
      answer_scale INTEGER
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      participant_id INTEGER NOT NULL REFERENCES participants(id),
      cycle_id INTEGER NOT NULL REFERENCES cycles(id),
      content_json TEXT NOT NULL,
      generated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Seed questions if not already seeded
  const count = db.prepare('SELECT COUNT(*) as count FROM questions').get() as { count: number };
  if (count.count === 0) {
    const insertQuestion = db.prepare(
      'INSERT INTO questions (text, category, type, order_index) VALUES (?, ?, ?, ?)'
    );

    const seedQuestions = db.transaction(() => {
      const selfQuestions: [string, string, string, number][] = [
        ['What are you most proud of in the last 6 months?', 'self', 'open', 1],
        ['Where have you grown the most?', 'self', 'open', 2],
        ["What's one thing you wish you did differently?", 'self', 'open', 3],
        ['What do you need more of to do your best work?', 'self', 'open', 4],
        ['Where do you feel stuck or limited?', 'self', 'open', 5],
        ['How would you describe your working style to someone new?', 'self', 'open', 6],
        ["What's one thing you'd like to be known for on this team?", 'self', 'open', 7],
      ];

      const peerQuestions: [string, string, string, number][] = [
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

      for (const q of selfQuestions) {
        insertQuestion.run(...q);
      }
      for (const q of peerQuestions) {
        insertQuestion.run(...q);
      }
    });

    seedQuestions();
  }
}
