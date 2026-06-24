import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { generateOnboardingResponse, type Message } from './flows/onboarding.js';
import { passport } from './auth.js';
import {
  pool,
  getOrCreateSession,
  getProgress,
  setProgress,
  getMessages,
  saveMessage,
  saveCvUpload,
  mergeAnonymousData,
} from './db.js';

declare module 'express-session' {
  interface SessionData {
    sessionId: string;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT ?? '8080';

app.set('trust proxy', 1);

const PgStore = connectPgSimple(session);

const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use(
  session({
    store: new PgStore({ pool, createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 365 * 24 * 60 * 60 * 1000, sameSite: 'lax' },
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(join(__dirname, 'public')));

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  async (req, res) => {
    if (req.user && req.session.sessionId) {
      const canonicalId = await mergeAnonymousData(req.session.sessionId, req.user.id);
      req.session.sessionId = canonicalId;
    }
    res.redirect('/');
  }
);

app.get('/auth/logout', (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.redirect('/');
    });
  });
});

app.use('/api', async (req, res, next) => {
  try {
    req.session.sessionId = await getOrCreateSession(req.session.sessionId);
    next();
  } catch (err) {
    next(err);
  }
});

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}

app.get('/api/session', async (req, res) => {
  const sessionId = req.session.sessionId as string;
  const progress = await getProgress(sessionId);
  const user = req.user ? { name: req.user.name, picture: req.user.picture } : null;
  res.json({ progress, user });
});

app.get('/api/messages', requireAuth, async (req, res) => {
  const sessionId = req.session.sessionId as string;
  const journey = req.query['journey'] as string | undefined;
  if (!journey) {
    res.status(400).json({ error: 'journey param required' });
    return;
  }
  const messages = await getMessages(sessionId, journey);
  res.json({ messages });
});

app.post('/api/progress', requireAuth, async (req, res) => {
  try {
    const sessionId = req.session.sessionId as string;
    const { journeyId, status } = req.body as { journeyId: string; status: string };
    await setProgress(sessionId, journeyId, status);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

app.post('/api/chat', requireAuth, async (req, res) => {
  try {
    const sessionId = req.session.sessionId as string;
    const { messages, journey = 'getting-started' } = req.body as {
      messages: Message[];
      journey?: string;
    };

    let reply: string;

    if (journey === 'getting-started') {
      reply = await generateOnboardingResponse(messages ?? []);
    } else {
      const name = journey
        .split('-')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      reply = `The **${name}** journey is coming soon. Complete the **Getting Started** journey to give us the context we need, and we'll guide you through this stage next.`;
    }

    const msgs = messages ?? [];
    if (msgs.length === 0) {
      await saveMessage(sessionId, journey, 'model', reply);
    } else {
      const last = msgs[msgs.length - 1];
      if (last.role === 'user') {
        await saveMessage(sessionId, journey, 'user', last.content);
      }
      await saveMessage(sessionId, journey, 'model', reply);
    }

    res.json({ reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

app.post('/api/upload', requireAuth, upload.single('cv'), async (req, res) => {
  try {
    const sessionId = req.session.sessionId as string;
    const filename = req.file?.originalname ?? 'unknown';
    const content = req.file?.buffer ?? null;
    await saveCvUpload(sessionId, filename, content);
    res.json({ success: true, filename });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to record upload' });
  }
});

app.listen(Number(port), () => {
  console.log(`Workita running on http://localhost:${port}`);
});
