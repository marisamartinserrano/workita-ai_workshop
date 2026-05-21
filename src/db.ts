import { Pool } from 'pg';
import { type Profile } from 'passport-google-oauth20';

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export interface DbUser {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export async function getOrCreateSession(sessionId: string | undefined): Promise<string> {
  if (sessionId) {
    const { rows } = await pool.query(
      'UPDATE sessions SET last_seen_at = NOW() WHERE id = $1 RETURNING id',
      [sessionId]
    );
    if (rows.length > 0) return rows[0].id as string;
  }
  const { rows } = await pool.query('INSERT INTO sessions DEFAULT VALUES RETURNING id');
  return rows[0].id as string;
}

export async function getProgress(sessionId: string): Promise<Record<string, string>> {
  const { rows } = await pool.query(
    'SELECT journey_id, status FROM journey_progress WHERE session_id = $1',
    [sessionId]
  );
  return Object.fromEntries(rows.map(r => [r.journey_id as string, r.status as string]));
}

export async function setProgress(sessionId: string, journeyId: string, status: string): Promise<void> {
  await pool.query(
    `INSERT INTO journey_progress (session_id, journey_id, status)
     VALUES ($1, $2, $3)
     ON CONFLICT (session_id, journey_id) DO UPDATE SET status = $3, updated_at = NOW()`,
    [sessionId, journeyId, status]
  );
}

export async function getMessages(sessionId: string, journeyId: string): Promise<Array<{ role: string; content: string }>> {
  const { rows } = await pool.query(
    'SELECT role, content FROM messages WHERE session_id = $1 AND journey_id = $2 ORDER BY created_at ASC',
    [sessionId, journeyId]
  );
  return rows as Array<{ role: string; content: string }>;
}

export async function saveMessage(sessionId: string, journeyId: string, role: string, content: string): Promise<void> {
  await pool.query(
    'INSERT INTO messages (session_id, journey_id, role, content) VALUES ($1, $2, $3, $4)',
    [sessionId, journeyId, role, content]
  );
}

export async function saveCvUpload(sessionId: string, filename: string, content: Buffer | null): Promise<void> {
  await pool.query(
    'INSERT INTO cv_uploads (session_id, filename, content) VALUES ($1, $2, $3)',
    [sessionId, filename, content]
  );
}

export async function getOrCreateUser(profile: Profile): Promise<DbUser> {
  const googleSub = profile.id;
  const email = profile.emails?.[0]?.value ?? '';
  const name = profile.displayName ?? '';
  const picture = profile.photos?.[0]?.value ?? '';

  const { rows } = await pool.query<DbUser>(
    `INSERT INTO users (google_sub, email, name, picture)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (google_sub) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name, picture = EXCLUDED.picture
     RETURNING id, email, name, picture`,
    [googleSub, email, name, picture]
  );
  return rows[0];
}

export async function getUserById(id: string): Promise<DbUser | null> {
  const { rows } = await pool.query<DbUser>(
    'SELECT id, email, name, picture FROM users WHERE id = $1',
    [id]
  );
  return rows[0] ?? null;
}

export async function mergeAnonymousData(anonymousSessionId: string, userId: string): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    'SELECT id FROM sessions WHERE user_id = $1',
    [userId]
  );

  if (rows.length === 0) {
    await pool.query('UPDATE sessions SET user_id = $1 WHERE id = $2', [userId, anonymousSessionId]);
    return anonymousSessionId;
  }

  const existingSessionId = rows[0].id;
  if (existingSessionId === anonymousSessionId) return existingSessionId;

  await pool.query(
    `INSERT INTO journey_progress (session_id, journey_id, status, updated_at)
     SELECT $1, journey_id, status, updated_at FROM journey_progress WHERE session_id = $2
     ON CONFLICT (session_id, journey_id) DO NOTHING`,
    [existingSessionId, anonymousSessionId]
  );

  await pool.query(
    `INSERT INTO messages (session_id, journey_id, role, content, created_at)
     SELECT $1, journey_id, role, content, created_at FROM messages WHERE session_id = $2`,
    [existingSessionId, anonymousSessionId]
  );

  await pool.query(
    `INSERT INTO cv_uploads (session_id, filename, uploaded_at)
     SELECT $1, filename, uploaded_at FROM cv_uploads WHERE session_id = $2`,
    [existingSessionId, anonymousSessionId]
  );

  return existingSessionId;
}
