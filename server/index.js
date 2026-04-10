import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import pg from 'pg';
const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:F4jh5VtqHsjb2H7zRCIBGycYpta5vYvvPetxbSnT4o6fbxmg5YV92C8pj4i1hVZ8@37.59.116.225:5432/postgres',
});

// Discord OAuth config
const DISCORD = {
  clientId: process.env.DISCORD_CLIENT_ID || 'YOUR_DISCORD_CLIENT_ID',
  clientSecret: process.env.DISCORD_CLIENT_SECRET || 'YOUR_DISCORD_CLIENT_SECRET',
  redirectUri: process.env.DISCORD_REDIRECT_URI || 'http://37.59.116.225:3002/auth/discord/callback',
  scopes: ['identify', 'email'],
};

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://37.59.116.225:5173';

// In-memory session store (use Redis in production)
const sessions = new Map();

app.use(cors({
  origin: process.env.CORS_ORIGIN || FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());

// Database init
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        discord_id VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        avatar VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS candidatures (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        company VARCHAR(255) NOT NULL,
        job_title VARCHAR(255) NOT NULL,
        location VARCHAR(255) DEFAULT '',
        date_applied DATE DEFAULT CURRENT_DATE,
        status VARCHAR(50) DEFAULT 'pending',
        source VARCHAR(50) DEFAULT 'Direct',
        notes TEXT DEFAULT '',
        job_url TEXT DEFAULT '',
        last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_candidatures_user ON candidatures(user_id);
    `);
    console.log('Database initialized');
  } finally {
    client.release();
  }
}

// Auth middleware
function requireAuth(req, res, next) {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  const session = sessions.get(sessionId);
  if (!session || session.expiresAt < new Date()) {
    sessions.delete(sessionId);
    return res.status(401).json({ error: 'Session expirée' });
  }

  req.userId = session.userId;
  next();
}

// Discord OAuth routes
app.get('/auth/discord', (req, res) => {
  const params = new URLSearchParams({
    client_id: DISCORD.clientId,
    redirect_uri: DISCORD.redirectUri,
    response_type: 'code',
    scope: DISCORD.scopes.join(' '),
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

app.get('/auth/discord/callback', async (req, res) => {
  const { code, error } = req.query;
  
  if (error) {
    console.error('Discord OAuth error:', error);
    return res.redirect(`${FRONTEND_URL}?error=${encodeURIComponent(error)}`);
  }
  
  if (!code) {
    return res.redirect(`${FRONTEND_URL}?error=no_code`);
  }

  try {
    console.log('Discord callback received, exchanging code...');
    // Exchange code for access token
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD.clientId,
        client_secret: DISCORD.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: DISCORD.redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();
    console.log('Token response:', JSON.stringify(tokenData));
    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }

    // Get Discord user info
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const discordUser = await userRes.json();

    // Upsert user in DB
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO users (discord_id, username, email, avatar)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (discord_id) DO UPDATE SET
           username = EXCLUDED.username,
           email = EXCLUDED.email,
           avatar = EXCLUDED.avatar`,
        [discordUser.id, discordUser.username, discordUser.email || '', discordUser.avatar || '']
      );

      const userResult = await client.query('SELECT * FROM users WHERE discord_id = $1', [discordUser.id]);
      const user = userResult.rows[0];

      // Create session
      const sessionId = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      sessions.set(sessionId, { userId: user.id, expiresAt });

      // Redirect to frontend with session info
      const redirectUrl = new URL(FRONTEND_URL);
      redirectUrl.searchParams.set('sessionId', sessionId);
      redirectUrl.searchParams.set('user', JSON.stringify({ id: user.id, username: user.username, avatar: user.avatar }));
      res.redirect(redirectUrl.toString());
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Discord auth error:', err);
    res.status(500).json({ error: 'Erreur d\'authentification' });
  }
});

app.get('/auth/me', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT id, username, email, avatar FROM users WHERE id = $1', [req.userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User non trouvé' });
    }
    res.json(result.rows[0]);
  } finally {
    client.release();
  }
});

app.post('/auth/logout', requireAuth, (req, res) => {
  const sessionId = req.headers['x-session-id'];
  sessions.delete(sessionId);
  res.json({ success: true });
});

// API routes (protected)
app.get('/api/candidatures', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM candidatures WHERE user_id = $1 ORDER BY date_applied DESC',
      [req.userId]
    );
    res.json(result.rows);
  } finally {
    client.release();
  }
});

app.post('/api/candidatures', requireAuth, async (req, res) => {
  const { company, jobTitle, location, source, notes, jobUrl } = req.body;

  if (!company || !jobTitle) {
    return res.status(400).json({ error: 'company et jobTitle sont requis' });
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO candidatures (user_id, company, job_title, location, source, notes, job_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.userId, company, jobTitle, location || '', source || 'Direct', notes || '', jobUrl || '']
    );
    res.status(201).json(result.rows[0]);
  } finally {
    client.release();
  }
});

app.patch('/api/candidatures/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const allowedFields = ['company', 'job_title', 'location', 'status', 'source', 'notes', 'job_url'];
  const setClause = [];
  const values = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(updates)) {
    const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (allowedFields.includes(dbKey)) {
      setClause.push(`${dbKey} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  if (setClause.length === 0) {
    return res.status(400).json({ error: 'Aucun champ valide à mettre à jour' });
  }

  setClause.push(`last_update = CURRENT_TIMESTAMP`);
  values.push(id, req.userId);

  const client = await pool.connect();
  try {
    const result = await client.query(
      `UPDATE candidatures SET ${setClause.join(', ')}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Candidature non trouvée' });
    }

    res.json(result.rows[0]);
  } finally {
    client.release();
  }
});

app.delete('/api/candidatures/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  const client = await pool.connect();
  try {
    const result = await client.query(
      'DELETE FROM candidatures WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Candidature non trouvée' });
    }

    res.json({ success: true });
  } finally {
    client.release();
  }
});

app.get('/api/stats', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const totalRes = await client.query(
      'SELECT COUNT(*) as total FROM candidatures WHERE user_id = $1',
      [req.userId]
    );
    const statusRes = await client.query(
      `SELECT status, COUNT(*) as count FROM candidatures
       WHERE user_id = $1 GROUP BY status`,
      [req.userId]
    );
    const sourceRes = await client.query(
      `SELECT source, COUNT(*) as count FROM candidatures
       WHERE user_id = $1 GROUP BY source`,
      [req.userId]
    );
    const monthRes = await client.query(
      `SELECT TO_CHAR(date_applied, 'YYYY-MM') as month, COUNT(*) as count
       FROM candidatures WHERE user_id = $1
       GROUP BY month ORDER BY month`,
      [req.userId]
    );

    const total = parseInt(totalRes.rows[0]?.total || 0);
    const byStatus = { pending: 0, interview: 0, rejected: 0, accepted: 0, withdrawn: 0 };
    statusRes.rows.forEach(r => { byStatus[r.status] = parseInt(r.count); });

    const responded = byStatus.interview + byStatus.rejected + byStatus.accepted + byStatus.withdrawn;
    const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;

    const bySource = {};
    sourceRes.rows.forEach(r => { bySource[r.source] = parseInt(r.count); });

    const byMonth = {};
    monthRes.rows.forEach(r => { byMonth[r.month] = parseInt(r.count); });

    res.json({ total, byStatus, responseRate, bySource, byMonth });
  } finally {
    client.release();
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`JobTracker server running on port ${PORT}`);
  initDB();
});
