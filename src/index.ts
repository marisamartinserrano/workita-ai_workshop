import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import multer from 'multer';
import net from 'net';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { generateOnboardingResponse, type Message } from './flows/onboarding.js';
import { analyzeCv, isCvContent, type CvAnalysisResult } from './flows/cvAnalysis.js';
import { analyzeLinkedin, type LinkedinAnalysisResult } from './flows/linkedinAnalysis.js';
import { analyzeJob, extractJobBasics, type JobAnalysisResult } from './flows/jobAnalysis.js';
import { generateInterviewPrep } from './flows/interviewPrep.js';

const require = createRequire(import.meta.url);

const CLAMAV_HOST = process.env.CLAMAV_HOST ?? 'clamav';
const CLAMAV_PORT = parseInt(process.env.CLAMAV_PORT ?? '3310');
const MAX_CV_BYTES = 10 * 1024 * 1024; // 10 MB

function detectFileType(buf: Buffer): 'pdf' | 'docx' | null {
  if (buf.length < 4) return null;
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return 'pdf';
  if (buf[0] === 0x50 && buf[1] === 0x4B && buf[2] === 0x03 && buf[3] === 0x04) return 'docx';
  return null;
}

async function scanWithClamav(buffer: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: CLAMAV_HOST, port: CLAMAV_PORT });
    let response = '';
    socket.setTimeout(30000);

    socket.on('connect', () => {
      socket.write('zINSTREAM\0');
      const lenBuf = Buffer.allocUnsafe(4);
      lenBuf.writeUInt32BE(buffer.length, 0);
      socket.write(lenBuf);
      socket.write(buffer);
      socket.write(Buffer.alloc(4, 0));
    });

    socket.on('data', (d) => { response += d.toString(); });

    socket.on('end', () => {
      socket.destroy();
      const result = response.trim();
      if (result.includes('FOUND')) {
        const m = result.match(/stream: (.+) FOUND/);
        reject(new Error(`VIRUS_DETECTED:${m ? m[1] : 'unknown threat'}`));
      } else if (result.includes('OK')) {
        resolve();
      } else {
        reject(new Error(`SCAN_FAILED:${result}`));
      }
    });

    socket.on('timeout', () => { socket.destroy(); reject(new Error('SCANNER_UNAVAILABLE:timeout')); });
    socket.on('error', (e) => { reject(new Error(`SCANNER_UNAVAILABLE:${e.message}`)); });
  });
}

async function extractText(buffer: Buffer, type: 'pdf' | 'docx'): Promise<string> {
  if (type === 'pdf') {
    const pdfParse = require('pdf-parse') as (b: Buffer) => Promise<{ text: string }>;
    const result = await pdfParse(buffer);
    return result.text;
  }
  const mammoth = require('mammoth') as { extractRawText: (o: { buffer: Buffer }) => Promise<{ value: string }> };
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

const FILE_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

// ── PDF report helpers ─────────────────────────────────────────────────────

type PdfColors = Record<string, string>;

function pdfSectionTitle(doc: any, title: string, M: number, W: number, C: PdfColors) {
  if (doc.y > doc.page.height - 120) doc.addPage();
  doc.font('Helvetica-Bold').fontSize(12).fillColor(C.blue).text(title, M);
  doc.moveTo(M, doc.y).lineTo(M + W, doc.y).strokeColor(C.border).lineWidth(0.5).stroke();
  doc.moveDown(0.4);
}

function pdfBulletList(doc: any, items: string[], M: number, W: number, C: PdfColors) {
  for (const item of items) {
    if (doc.y > doc.page.height - 80) doc.addPage();
    doc.font('Helvetica').fontSize(10).fillColor(C.body).text(`• ${item}`, M, doc.y, { width: W });
  }
  doc.moveDown(0.5);
}

function pdfChips(doc: any, items: string[], M: number, W: number, C: PdfColors) {
  if (!items.length) { doc.moveDown(0.5); return; }
  const H = 20, PX = 10, PY = 5, GAP = 6, ROWGAP = 8, FS = 9;
  doc.font('Helvetica').fontSize(FS);
  let cx = M, cy = doc.y;
  for (const item of items) {
    const cw = doc.widthOfString(item) + PX * 2;
    if (cx + cw > M + W) { cx = M; cy += H + ROWGAP; }
    if (cy > doc.page.height - 80) { doc.addPage(); cy = M; cx = M; }
    doc.roundedRect(cx, cy, cw, H, 4).fillColor(C.blueBg).fill();
    doc.font('Helvetica').fontSize(FS).fillColor(C.blue)
      .text(item, cx + PX, cy + PY, { lineBreak: false });
    cx += cw + GAP;
  }
  doc.y = cy + H + 10;
}

function pdfAtsItem(doc: any, item: { item: string; status: string; suggestion: string }, M: number, W: number, C: PdfColors) {
  if (doc.y > doc.page.height - 80) doc.addPage();
  const badgeColor = item.status === 'pass' ? C.green : item.status === 'warn' ? C.amber : C.red;
  const BW = 46, BH = 18, TX = M + BW + 10, TW = W - BW - 10;
  const sy = doc.y;
  doc.roundedRect(M, sy, BW, BH, 3).fillColor(badgeColor).fill();
  doc.font('Helvetica-Bold').fontSize(8).fillColor('white')
    .text(item.status.toUpperCase(), M, sy + 4, { width: BW, align: 'center', lineBreak: false });
  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.dark).text(item.item, TX, sy, { width: TW });
  if (item.suggestion) {
    doc.font('Helvetica').fontSize(9).fillColor(C.muted).text(item.suggestion, TX, doc.y, { width: TW });
  }
  if (doc.y < sy + BH + 4) doc.y = sy + BH + 4;
  doc.moveDown(0.5);
}

function pdfLinkedinRec(doc: any, rec: { title: string; rationale: string; priority: string }, M: number, W: number, C: PdfColors) {
  if (doc.y > doc.page.height - 80) doc.addPage();
  const badgeColor = rec.priority === 'high' ? C.red : rec.priority === 'medium' ? C.orange : C.green;
  const BW = 58, BH = 18, TX = M + BW + 10, TW = W - BW - 10;
  const sy = doc.y;
  doc.roundedRect(M, sy, BW, BH, 3).fillColor(badgeColor).fill();
  doc.font('Helvetica-Bold').fontSize(8).fillColor('white')
    .text(rec.priority.toUpperCase(), M, sy + 4, { width: BW, align: 'center', lineBreak: false });
  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.dark).text(rec.title, TX, sy, { width: TW });
  doc.font('Helvetica').fontSize(9).fillColor(C.body).text(rec.rationale, TX, doc.y, { width: TW });
  if (doc.y < sy + BH + 4) doc.y = sy + BH + 4;
  doc.moveDown(0.8);
}

function pdfHeader(doc: any, subtitle: string, candidateName: string, M: number, W: number, C: PdfColors) {
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.font('Helvetica-Bold').fontSize(22).fillColor(C.blue).text('Workita', M, M);
  doc.font('Helvetica').fontSize(14).fillColor(C.dark).text(subtitle, M);
  doc.font('Helvetica').fontSize(10).fillColor(C.muted).text(`${candidateName}  ·  ${date}`, M);
  doc.moveDown(0.6);
  doc.moveTo(M, doc.y).lineTo(M + W, doc.y).strokeColor(C.blue).lineWidth(1.5).stroke();
  doc.moveDown(1);
}

async function generateCvAnalysisPdf(analysis: CvAnalysisResult, candidateName: string): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const PDFDocClass = require('pdfkit') as { new(opts?: Record<string, unknown>): any };
    const doc = new PDFDocClass({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    const M = 50, W = doc.page.width - M * 2;
    const C: PdfColors = {
      blue: '#1a73e8', blueBg: '#e8f0fe', green: '#34a853',
      amber: '#f9ab00', red: '#ea4335', dark: '#202124',
      body: '#3c4043', muted: '#5f6368', border: '#e8eaed',
    };
    pdfHeader(doc, 'CV Analysis Report', candidateName, M, W, C);
    pdfSectionTitle(doc, 'Skills', M, W, C);
    pdfChips(doc, analysis.skills ?? [], M, W, C);
    pdfSectionTitle(doc, 'Experience', M, W, C);
    pdfBulletList(doc, analysis.experience ?? [], M, W, C);
    pdfSectionTitle(doc, 'Education', M, W, C);
    pdfBulletList(doc, analysis.education ?? [], M, W, C);
    pdfSectionTitle(doc, 'Profile Gaps', M, W, C);
    pdfBulletList(doc, analysis.gaps ?? [], M, W, C);
    pdfSectionTitle(doc, 'ATS Feedback', M, W, C);
    for (const item of (analysis.atsFeedback ?? [])) pdfAtsItem(doc, item, M, W, C);
    doc.end();
  });
}

async function generateLinkedinAnalysisPdf(analysis: LinkedinAnalysisResult, candidateName: string): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const PDFDocClass = require('pdfkit') as { new(opts?: Record<string, unknown>): any };
    const doc = new PDFDocClass({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    const M = 50, W = doc.page.width - M * 2;
    const C: PdfColors = {
      blue: '#1a73e8', blueBg: '#e8f0fe', green: '#34a853', orange: '#fa7b17',
      amber: '#f9ab00', red: '#ea4335', dark: '#202124',
      body: '#3c4043', muted: '#5f6368', border: '#e8eaed',
    };
    pdfHeader(doc, 'LinkedIn Analysis Report', candidateName, M, W, C);
    if (analysis.note) {
      doc.font('Helvetica').fontSize(10).fillColor(C.muted).text(analysis.note, M, doc.y, { width: W });
      doc.moveDown(0.8);
    }
    pdfSectionTitle(doc, 'Recommendations', M, W, C);
    for (const rec of (analysis.recommendations ?? [])) pdfLinkedinRec(doc, rec, M, W, C);
    doc.end();
  });
}

type CandidaturePdfData = {
  job_title: string;
  company: string;
  seniority: string | null;
  location: string | null;
  work_mode: string | null;
  match_pct: number | null;
  analysis: JobAnalysisResult;
  candidate_name: string;
};

async function generateCandidaturePdf(data: CandidaturePdfData): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const PDFDocClass = require('pdfkit') as { new(opts?: Record<string, unknown>): any };
    const doc = new PDFDocClass({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    const M = 50, W = doc.page.width - M * 2;
    const C: PdfColors = {
      blue: '#1a73e8', blueBg: '#e8f0fe', green: '#34a853', teal: '#00897b',
      amber: '#f9ab00', red: '#ea4335', dark: '#202124',
      body: '#3c4043', muted: '#5f6368', border: '#e8eaed',
    };
    const { analysis } = data;
    const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    // Header block
    const headerY = M;
    doc.font('Helvetica-Bold').fontSize(22).fillColor(C.blue).text('Workita', M, headerY);
    doc.font('Helvetica-Bold').fontSize(15).fillColor(C.dark).text(data.job_title, M);
    doc.font('Helvetica').fontSize(12).fillColor(C.body).text(`at ${data.company}`, M);
    const metaParts = [data.seniority, data.location, data.work_mode].filter(Boolean) as string[];
    if (metaParts.length) doc.font('Helvetica').fontSize(10).fillColor(C.muted).text(metaParts.join(' · '), M);
    doc.font('Helvetica').fontSize(10).fillColor(C.muted).text(`${data.candidate_name}  ·  ${date}`, M);

    // Match circle (top-right)
    if (data.match_pct !== null) {
      const matchColor = data.match_pct >= 75 ? C.green : data.match_pct >= 50 ? C.amber : C.red;
      const cx = M + W - 30, cy = headerY + 30;
      doc.circle(cx, cy, 30).strokeColor(matchColor).lineWidth(5).stroke();
      doc.font('Helvetica-Bold').fontSize(16).fillColor(matchColor)
        .text(`${data.match_pct}%`, cx - 30, cy - 12, { width: 60, align: 'center', lineBreak: false });
      doc.font('Helvetica').fontSize(8).fillColor(C.muted)
        .text('Match', cx - 30, cy + 8, { width: 60, align: 'center', lineBreak: false });
    }

    doc.moveDown(0.6);
    doc.moveTo(M, doc.y).lineTo(M + W, doc.y).strokeColor(C.blue).lineWidth(1.5).stroke();
    doc.moveDown(1);

    // Company Overview
    pdfSectionTitle(doc, 'Company Overview', M, W, C);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.dark).text(analysis.company.name, M);
    doc.font('Helvetica').fontSize(10).fillColor(C.body).text(analysis.company.summary, M, doc.y, { width: W });
    if (analysis.company.industry) {
      doc.font('Helvetica').fontSize(9).fillColor(C.muted)
        .text(`Industry: ${analysis.company.industry}  ·  ${analysis.company.financialHealth}`, M, doc.y, { width: W });
    }
    if (analysis.company.recentNews && analysis.company.recentNews !== 'Not available') {
      doc.font('Helvetica').fontSize(9).fillColor(C.muted)
        .text(`Recent: ${analysis.company.recentNews}`, M, doc.y, { width: W });
    }
    doc.moveDown(0.8);

    // Role Requirements
    pdfSectionTitle(doc, 'Role Requirements', M, W, C);
    pdfChips(doc, analysis.role.skills ?? [], M, W, C);
    const roleDetails = [
      analysis.role.experienceLevel && `Experience: ${analysis.role.experienceLevel}`,
      analysis.role.salary && analysis.role.salary !== 'Not specified' && `Salary: ${analysis.role.salary}`,
    ].filter(Boolean) as string[];
    if (roleDetails.length) {
      doc.font('Helvetica').fontSize(10).fillColor(C.body).text(roleDetails.join('   ·   '), M, doc.y, { width: W });
    }
    doc.moveDown(0.8);

    // Strengths / Gaps / Differentiators
    if (analysis.strengths?.length) {
      pdfSectionTitle(doc, 'Your Strengths', M, W, C);
      pdfBulletList(doc, analysis.strengths, M, W, C);
    }
    if (analysis.gaps?.length) {
      pdfSectionTitle(doc, 'Gaps to Address', M, W, C);
      pdfBulletList(doc, analysis.gaps, M, W, C);
    }
    if (analysis.differentiators?.length) {
      pdfSectionTitle(doc, 'Key Differentiators', M, W, C);
      pdfBulletList(doc, analysis.differentiators, M, W, C);
    }

    // ATS Keywords
    if (analysis.atsKeywords?.length) {
      pdfSectionTitle(doc, 'ATS Keywords', M, W, C);
      const KW = 155;
      for (const kw of analysis.atsKeywords) {
        if (doc.y > doc.page.height - 80) doc.addPage();
        const rowY = doc.y;
        doc.font('Helvetica-Bold').fontSize(10).fillColor(C.blue).text(kw.keyword, M, rowY, { width: KW, lineBreak: false });
        doc.font('Helvetica').fontSize(10).fillColor(C.body).text(kw.tip, M + KW + 12, rowY, { width: W - KW - 12 });
        if (doc.y < rowY + 14) doc.y = rowY + 14;
        doc.moveDown(0.3);
      }
      doc.moveDown(0.5);
    }

    // CV Recommendations
    if (analysis.cvRecommendations?.length) {
      pdfSectionTitle(doc, 'CV Recommendations', M, W, C);
      pdfBulletList(doc, analysis.cvRecommendations, M, W, C);
    }

    // LinkedIn Recommendations
    if (analysis.linkedinRecommendations?.length) {
      pdfSectionTitle(doc, 'LinkedIn Recommendations', M, W, C);
      pdfBulletList(doc, analysis.linkedinRecommendations, M, W, C);
    }

    // Networking Guidance (teal accent)
    if (analysis.networkingGuidance?.length) {
      if (doc.y > doc.page.height - 120) doc.addPage();
      doc.moveTo(M, doc.y).lineTo(M + W, doc.y).strokeColor(C.teal).lineWidth(1.5).stroke();
      doc.moveDown(0.4);
      doc.font('Helvetica-Bold').fontSize(12).fillColor(C.teal).text('Networking Guidance', M);
      doc.moveTo(M, doc.y).lineTo(M + W, doc.y).strokeColor(C.border).lineWidth(0.5).stroke();
      doc.moveDown(0.4);
      pdfBulletList(doc, analysis.networkingGuidance, M, W, C);
    }

    doc.end();
  });
}

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

app.get('/api/profile', requireAuth, async (req, res) => {
  try {
    const user = req.user as { id: string; name: string };
    const { rows } = await pool.query(
      `SELECT target_role, seniority, industry, location, work_mode, salary,
              preferred_companies, cv_text, cv_filename, cv_file_type, linkedin_url, cv_analysis, linkedin_analysis
       FROM profiles WHERE user_id = $1`,
      [user.id]
    );
    res.json({ name: user.name, ...(rows[0] ?? {}) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

app.post('/api/profile', requireAuth, async (req, res) => {
  try {
    const userId = (req.user as { id: string }).id;
    const body = req.body as Record<string, string | undefined>;
    const allowed = ['target_role', 'seniority', 'industry', 'location', 'work_mode', 'salary', 'preferred_companies', 'linkedin_url'] as const;
    const fields: string[] = [];
    const vals: (string | null)[] = [];
    for (const f of allowed) {
      if (f in body) { fields.push(f); vals.push(body[f] ?? null); }
    }
    if (fields.length === 0) { res.json({ ok: true }); return; }
    const placeholders = fields.map((_, i) => `$${i + 2}`).join(', ');
    const setClauses = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    await pool.query(
      `INSERT INTO profiles (user_id, ${fields.join(', ')}, updated_at)
       VALUES ($1, ${placeholders}, NOW())
       ON CONFLICT (user_id) DO UPDATE SET ${setClauses}, updated_at = NOW()`,
      [userId, ...vals]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

app.post('/api/profile/analyze-cv', requireAuth, async (req, res) => {
  try {
    const userId = (req.user as { id: string }).id;
    const { rows } = await pool.query('SELECT cv_text FROM profiles WHERE user_id = $1', [userId]);
    const cvText = rows[0]?.cv_text as string | undefined;
    if (!cvText) {
      res.status(400).json({ error: 'No CV text saved. Save your CV first.' });
      return;
    }
    const result = await analyzeCv(cvText);
    await pool.query(
      'UPDATE profiles SET cv_analysis = $1, updated_at = NOW() WHERE user_id = $2',
      [JSON.stringify(result), userId]
    );
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'CV analysis failed' });
  }
});

app.post('/api/profile/analyze-linkedin', requireAuth, async (req, res) => {
  try {
    const userId = (req.user as { id: string }).id;
    const { rows } = await pool.query(
      'SELECT cv_text, linkedin_url, target_role, seniority FROM profiles WHERE user_id = $1',
      [userId]
    );
    const profile = rows[0];
    if (!profile?.cv_text) {
      res.status(400).json({ error: 'No CV found in your profile. Please upload your CV in the CV & Analysis section first.' });
      return;
    }
    const result = await analyzeLinkedin(
      profile.cv_text as string,
      profile.linkedin_url as string | undefined,
      profile.target_role as string | undefined,
      profile.seniority as string | undefined,
    );
    await pool.query(
      'UPDATE profiles SET linkedin_analysis = $1, updated_at = NOW() WHERE user_id = $2',
      [JSON.stringify(result), userId]
    );
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'LinkedIn analysis failed' });
  }
});

app.get('/api/home', requireAuth, async (req, res) => {
  try {
    const userId = (req.user as { id: string }).id;

    const [statsResult, candidaturesResult] = await Promise.all([
      pool.query<{
        total: string;
        interviews: string;
        offers: string;
        avg_match: string | null;
      }>(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (
             WHERE id IN (
               SELECT DISTINCT candidature_id FROM candidature_stages
               WHERE stage_name ILIKE '%interview%'
             )
           )::int AS interviews,
           COUNT(*) FILTER (WHERE status = 'offer')::int AS offers,
           ROUND(AVG(match_pct))::int AS avg_match
         FROM candidatures WHERE user_id = $1`,
        [userId]
      ),
      pool.query<{
        id: string;
        job_title: string;
        company: string;
        status: string;
        match_pct: number | null;
        current_stage: string | null;
      }>(
        `SELECT c.id, c.job_title, c.company, c.status, c.match_pct,
                COALESCE(
                  (SELECT stage_name FROM candidature_stages WHERE candidature_id = c.id AND status = 'scheduled' ORDER BY stage_order ASC LIMIT 1),
                  (SELECT s2.stage_name FROM candidature_stages s2 WHERE s2.candidature_id = c.id AND s2.status = 'pending' AND s2.stage_order > COALESCE((SELECT stage_order FROM candidature_stages WHERE candidature_id = c.id AND status = 'completed' ORDER BY stage_order DESC LIMIT 1), -1) ORDER BY s2.stage_order ASC LIMIT 1),
                  (SELECT stage_name FROM candidature_stages WHERE candidature_id = c.id AND status = 'completed' ORDER BY stage_order DESC LIMIT 1),
                  (SELECT stage_name FROM candidature_stages WHERE candidature_id = c.id ORDER BY stage_order ASC LIMIT 1)
                ) AS current_stage
         FROM candidatures c
         WHERE c.user_id = $1
         ORDER BY c.created_at DESC`,
        [userId]
      ),
    ]);

    const s = statsResult.rows[0];
    res.json({
      user: req.user,
      stats: {
        total: Number(s.total),
        interviews: Number(s.interviews),
        offers: Number(s.offers),
        avgMatch: s.avg_match !== null ? Number(s.avg_match) : null,
      },
      candidatures: candidaturesResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load home data' });
  }
});

app.post('/api/profile/upload-cv', requireAuth, upload.single('cv_file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'No file uploaded.' }); return; }
    if (file.size > MAX_CV_BYTES) { res.status(400).json({ error: 'File too large. Maximum size is 10 MB.' }); return; }

    const fileType = detectFileType(file.buffer);
    if (!fileType) {
      res.status(400).json({ error: 'Unsupported format. Please upload a PDF or DOCX file.' });
      return;
    }

    try {
      await scanWithClamav(file.buffer);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.startsWith('VIRUS_DETECTED:')) {
        res.status(422).json({ error: 'Security scan failed: malicious content detected. Please upload a clean document.' });
      } else if (msg.startsWith('SCANNER_UNAVAILABLE:')) {
        res.status(503).json({ error: 'Security scanner is warming up. Please try again in a few minutes.' });
      } else {
        res.status(500).json({ error: 'Security scan error. Please try again.' });
      }
      return;
    }

    let cvText: string;
    try {
      cvText = await extractText(file.buffer, fileType);
    } catch {
      res.status(422).json({ error: 'Could not extract text from the document. Please try a different file.' });
      return;
    }

    if (cvText.trim().length < 200) {
      res.status(422).json({ error: 'The document appears to be empty or contains too little text. Please upload your CV.' });
      return;
    }

    const isCV = await isCvContent(cvText);
    if (!isCV) {
      res.status(422).json({ error: 'This document does not look like a CV. Please upload your CV or résumé.' });
      return;
    }

    const userId = (req.user as { id: string }).id;
    const cvFilename = file.originalname;
    const cvFileType = FILE_MIME[fileType];
    await pool.query(
      `INSERT INTO profiles (user_id, cv_text, cv_filename, cv_file, cv_file_type, cv_analysis, updated_at)
       VALUES ($1, $2, $3, $4, $5, NULL, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         cv_text = EXCLUDED.cv_text,
         cv_filename = EXCLUDED.cv_filename,
         cv_file = EXCLUDED.cv_file,
         cv_file_type = EXCLUDED.cv_file_type,
         cv_analysis = NULL,
         updated_at = NOW()`,
      [userId, cvText, cvFilename, file.buffer, cvFileType]
    );

    res.json({ ok: true, cv_text: cvText, cv_filename: cvFilename });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed. Please try again.' });
  }
});

app.get('/api/profile/cv-file', requireAuth, async (req, res) => {
  try {
    const userId = (req.user as { id: string }).id;
    const { rows } = await pool.query(
      'SELECT cv_file, cv_filename, cv_file_type FROM profiles WHERE user_id = $1',
      [userId]
    );
    const row = rows[0];
    if (!row?.cv_file) { res.status(404).json({ error: 'No CV on file.' }); return; }
    const mimeType = row.cv_file_type || 'application/octet-stream';
    const filename = row.cv_filename || 'cv';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(row.cv_file);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Download failed.' });
  }
});

app.get('/api/profile/cv-analysis/download', requireAuth, async (req, res) => {
  try {
    const user = req.user as { id: string; name: string };
    const { rows } = await pool.query(
      'SELECT cv_analysis FROM profiles WHERE user_id = $1',
      [user.id]
    );
    const analysis = rows[0]?.cv_analysis as CvAnalysisResult | undefined;
    if (!analysis) { res.status(404).json({ error: 'No CV analysis available.' }); return; }
    const pdf = await generateCvAnalysisPdf(analysis, user.name || 'Candidate');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="cv-analysis-report.pdf"');
    res.send(pdf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Download failed.' });
  }
});

app.get('/api/profile/linkedin-analysis/download', requireAuth, async (req, res) => {
  try {
    const user = req.user as { id: string; name: string };
    const { rows } = await pool.query(
      'SELECT linkedin_analysis FROM profiles WHERE user_id = $1',
      [user.id]
    );
    const analysis = rows[0]?.linkedin_analysis as LinkedinAnalysisResult | undefined;
    if (!analysis) { res.status(404).json({ error: 'No LinkedIn analysis available.' }); return; }
    const pdf = await generateLinkedinAnalysisPdf(analysis, user.name || 'Candidate');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="linkedin-analysis-report.pdf"');
    res.send(pdf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Download failed.' });
  }
});

const SELECTION_STAGES = [
  'Application submitted',
  'Interview with recruiter',
  'Technical interview',
  'Use case or assignment',
  'Team interview',
  'Manager interview',
  'Client/Stakeholder interview',
  'Cultural interview',
  'Leadership interview',
  'Offer received / Candidature rejected',
];

async function fetchJobDescription(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Workita/1.0)' },
    });
    const html = await res.text();
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text.slice(0, 8000);
  } finally {
    clearTimeout(timeout);
  }
}

app.post('/api/candidatures/prefill', requireAuth, async (req, res) => {
  try {
    const { job_url } = req.body as { job_url: string };
    if (!job_url?.trim()) { res.status(400).json({ error: 'URL required.' }); return; }
    let jobText: string;
    try {
      jobText = await fetchJobDescription(job_url.trim());
    } catch {
      res.status(422).json({ error: 'Could not fetch the job posting.' });
      return;
    }
    const basics = await extractJobBasics(jobText);
    res.json(basics);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Prefill failed.' });
  }
});

app.post('/api/candidatures', requireAuth, async (req, res) => {
  try {
    const userId = (req.user as { id: string }).id;
    const body = req.body as Record<string, string>;
    const { job_url, company, job_title, seniority, location, work_mode, industry, labels, status, additional_info } = body;

    if (!job_url || !job_url.trim()) {
      res.status(400).json({ error: 'Job posting URL is required.' });
      return;
    }

    let jobText: string;
    try {
      jobText = await fetchJobDescription(job_url.trim());
    } catch {
      res.status(422).json({ error: 'Could not fetch the job posting. Please check the URL and try again.' });
      return;
    }

    const { rows: profileRows } = await pool.query<{ cv_text: string | null; target_role: string | null; seniority: string | null }>(
      'SELECT cv_text, target_role, seniority FROM profiles WHERE user_id = $1',
      [userId],
    );
    const profile = profileRows[0];
    const hasProfile = !!(profile?.cv_text && profile.cv_text.trim().length > 100);

    const analysis = await analyzeJob(
      jobText,
      hasProfile ? profile.cv_text ?? undefined : undefined,
      profile?.target_role ?? undefined,
      profile?.seniority ?? undefined,
    );

    const resolvedTitle = job_title?.trim() || analysis.role.title || 'Unknown Role';
    const resolvedCompany = company?.trim() || analysis.company.name || 'Unknown Company';
    const resolvedSeniority = seniority?.trim() || analysis.role.seniority || null;
    const resolvedLocation = location?.trim() || analysis.role.location || null;
    const resolvedWorkMode = work_mode?.trim() || analysis.role.workMode || null;
    const resolvedIndustry = industry?.trim() || analysis.role.industry || null;
    const resolvedStatus = status?.trim() || 'Applied';
    const matchPct = analysis.matchPct ?? null;
    const labelsArray = labels ? labels.split(',').map((l: string) => l.trim()).filter(Boolean) : [];

    const { rows: candRows } = await pool.query<{ id: string }>(
      `INSERT INTO candidatures
         (user_id, job_title, company, job_url, seniority, location, work_mode, industry, labels, status, additional_info, match_pct, analysis, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
       RETURNING id`,
      [userId, resolvedTitle, resolvedCompany, job_url.trim(), resolvedSeniority, resolvedLocation, resolvedWorkMode, resolvedIndustry, labelsArray, resolvedStatus, additional_info?.trim() || null, matchPct, JSON.stringify(analysis)],
    );
    const candidatureId = candRows[0].id;

    for (let i = 0; i < SELECTION_STAGES.length; i++) {
      await pool.query(
        'INSERT INTO candidature_stages (candidature_id, stage_name, stage_order, status) VALUES ($1, $2, $3, $4)',
        [candidatureId, SELECTION_STAGES[i], i, i === 0 ? 'completed' : 'pending'],
      );
    }

    res.json({ id: candidatureId, job_title: resolvedTitle, company: resolvedCompany, analysis, hasProfile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Analysis failed. Please try again.' });
  }
});

app.get('/api/candidatures', requireAuth, async (req, res) => {
  try {
    const userId = (req.user as { id: string }).id;
    const { rows } = await pool.query(
      `SELECT c.id, c.job_title, c.company, c.job_url, c.seniority, c.location, c.work_mode,
              c.industry, c.labels, c.status, c.additional_info, c.match_pct, c.created_at,
              COALESCE(
                (SELECT stage_name FROM candidature_stages WHERE candidature_id = c.id AND status = 'scheduled' ORDER BY stage_order ASC LIMIT 1),
                (SELECT s2.stage_name FROM candidature_stages s2 WHERE s2.candidature_id = c.id AND s2.status = 'pending' AND s2.stage_order > COALESCE((SELECT stage_order FROM candidature_stages WHERE candidature_id = c.id AND status = 'completed' ORDER BY stage_order DESC LIMIT 1), -1) ORDER BY s2.stage_order ASC LIMIT 1),
                (SELECT stage_name FROM candidature_stages WHERE candidature_id = c.id AND status = 'completed' ORDER BY stage_order DESC LIMIT 1),
                (SELECT stage_name FROM candidature_stages WHERE candidature_id = c.id ORDER BY stage_order ASC LIMIT 1)
              ) AS current_stage
       FROM candidatures c
       WHERE c.user_id = $1
       ORDER BY c.created_at DESC`,
      [userId],
    );
    res.json({ candidatures: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load candidatures.' });
  }
});

app.get('/api/candidatures/pipeline', requireAuth, async (req, res) => {
  try {
    const userId = (req.user as { id: string }).id;
    const { rows } = await pool.query(
      `SELECT
         COALESCE(
           (SELECT stage_order FROM candidature_stages WHERE candidature_id = c.id AND status = 'scheduled' ORDER BY stage_order ASC LIMIT 1),
           (SELECT s2.stage_order FROM candidature_stages s2 WHERE s2.candidature_id = c.id AND s2.status = 'pending' AND s2.stage_order > COALESCE((SELECT stage_order FROM candidature_stages WHERE candidature_id = c.id AND status = 'completed' ORDER BY stage_order DESC LIMIT 1), -1) ORDER BY s2.stage_order ASC LIMIT 1),
           (SELECT stage_order FROM candidature_stages WHERE candidature_id = c.id AND status = 'completed' ORDER BY stage_order DESC LIMIT 1),
           0
         )::int AS step_order
       FROM candidatures c
       WHERE c.user_id = $1`,
      [userId],
    );

    const counts = new Array(SELECTION_STAGES.length).fill(0);
    for (const row of rows) {
      const idx = Number(row.step_order);
      if (idx >= 0 && idx < counts.length) counts[idx]++;
    }

    const distribution = SELECTION_STAGES.map((name, i) => ({ step: name, count: counts[i] }));
    res.json({ distribution });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load pipeline data.' });
  }
});

app.get('/api/candidatures/:id/download', requireAuth, async (req, res) => {
  try {
    const userId = (req.user as { id: string }).id;
    const { rows } = await pool.query(
      'SELECT c.*, u.name AS candidate_name FROM candidatures c JOIN users u ON u.id = c.user_id WHERE c.id = $1 AND c.user_id = $2',
      [req.params.id, userId],
    );
    if (!rows[0]) { res.status(404).json({ error: 'Not found.' }); return; }
    const row = rows[0];
    if (!row.analysis) { res.status(422).json({ error: 'No analysis available.' }); return; }
    const pdf = await generateCandidaturePdf(row as CandidaturePdfData);
    const filename = `${(row.job_title as string).replace(/[^a-z0-9]/gi, '_')}_report.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate report.' });
  }
});

app.get('/api/candidatures/:id', requireAuth, async (req, res) => {
  try {
    const userId = (req.user as { id: string }).id;
    const { rows } = await pool.query(
      'SELECT c.* FROM candidatures c WHERE c.id = $1 AND c.user_id = $2',
      [req.params.id, userId],
    );
    if (!rows[0]) { res.status(404).json({ error: 'Not found.' }); return; }
    const hasProfile = !!(await pool.query('SELECT cv_text FROM profiles WHERE user_id = $1', [userId])).rows[0]?.cv_text;
    res.json({ ...rows[0], hasProfile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load candidature.' });
  }
});

app.delete('/api/candidatures/:id', requireAuth, async (req, res) => {
  try {
    const userId = (req.user as { id: string }).id;
    const result = await pool.query('DELETE FROM candidatures WHERE id = $1 AND user_id = $2', [req.params.id, userId]);
    if (!result.rowCount) { res.status(404).json({ error: 'Not found.' }); return; }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete.' });
  }
});

app.put('/api/candidatures/:id', requireAuth, async (req, res) => {
  try {
    const userId = (req.user as { id: string }).id;
    const b = req.body as Record<string, string>;
    const labels = b.labels ? b.labels.split(',').map((l: string) => l.trim()).filter(Boolean) : [];
    const { rows } = await pool.query(
      `UPDATE candidatures SET
         company       = COALESCE(NULLIF(TRIM($2),  ''), company),
         job_title     = COALESCE(NULLIF(TRIM($3),  ''), job_title),
         job_url       = NULLIF(TRIM($4),  ''),
         seniority     = NULLIF(TRIM($5),  ''),
         location      = NULLIF(TRIM($6),  ''),
         work_mode     = NULLIF(TRIM($7),  ''),
         industry      = NULLIF(TRIM($8),  ''),
         labels        = $9,
         status        = COALESCE(NULLIF(TRIM($10), ''), status),
         additional_info = NULLIF(TRIM($11), '')
       WHERE id = $1 AND user_id = $12
       RETURNING *`,
      [req.params.id, b.company, b.job_title, b.job_url, b.seniority, b.location,
       b.work_mode, b.industry, labels, b.status, b.additional_info, userId],
    );
    if (!rows[0]) { res.status(404).json({ error: 'Not found.' }); return; }
    const hasProfile = !!(await pool.query('SELECT cv_text FROM profiles WHERE user_id = $1', [userId])).rows[0]?.cv_text;
    res.json({ ...rows[0], hasProfile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update.' });
  }
});

app.get('/api/candidatures/:id/stages', requireAuth, async (req, res) => {
  try {
    const userId = (req.user as { id: string }).id;
    const { rows: cand } = await pool.query(
      'SELECT id FROM candidatures WHERE id = $1 AND user_id = $2',
      [req.params.id, userId],
    );
    if (!cand[0]) { res.status(404).json({ error: 'Not found.' }); return; }
    const { rows } = await pool.query(
      'SELECT id, stage_name, stage_order, status, notes, scheduled_at, completed_at, ai_prep FROM candidature_stages WHERE candidature_id = $1 ORDER BY stage_order ASC, entered_at ASC',
      [req.params.id],
    );
    res.json({ stages: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load stages.' });
  }
});

app.patch('/api/candidatures/:id/stages/:stageId', requireAuth, async (req, res) => {
  try {
    const userId = (req.user as { id: string }).id;
    const { status, notes } = req.body as { status?: string; notes?: string };

    const { rows: cand } = await pool.query(
      'SELECT id FROM candidatures WHERE id = $1 AND user_id = $2',
      [req.params.id, userId],
    );
    if (!cand[0]) { res.status(404).json({ error: 'Not found.' }); return; }

    const sets: string[] = [];
    const vals: (string | null)[] = [];

    if (status !== undefined) {
      vals.push(status);
      const idx = vals.length;
      sets.push(`status = $${idx}`);
      sets.push(`scheduled_at = CASE WHEN $${idx} = 'scheduled' AND scheduled_at IS NULL THEN NOW() ELSE scheduled_at END`);
      sets.push(`completed_at = CASE WHEN $${idx} = 'completed' AND completed_at IS NULL THEN NOW() ELSE completed_at END`);
    }
    if (notes !== undefined) {
      vals.push(notes);
      sets.push(`notes = $${vals.length}`);
    }

    if (sets.length === 0) { res.json({ ok: true }); return; }

    vals.push(req.params.stageId);
    vals.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE candidature_stages SET ${sets.join(', ')} WHERE id = $${vals.length - 1} AND candidature_id = $${vals.length} RETURNING *`,
      vals,
    );
    if (!rows[0]) { res.status(404).json({ error: 'Stage not found.' }); return; }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update stage.' });
  }
});

app.post('/api/candidatures/:id/stages/:stageId/prep', requireAuth, async (req, res) => {
  try {
    const userId = (req.user as { id: string }).id;
    const { rows: cand } = await pool.query(
      'SELECT job_title, company FROM candidatures WHERE id = $1 AND user_id = $2',
      [req.params.id, userId],
    );
    if (!cand[0]) { res.status(404).json({ error: 'Not found.' }); return; }

    const { rows: stage } = await pool.query(
      'SELECT stage_name FROM candidature_stages WHERE id = $1 AND candidature_id = $2',
      [req.params.stageId, req.params.id],
    );
    if (!stage[0]) { res.status(404).json({ error: 'Stage not found.' }); return; }

    const result = await generateInterviewPrep(
      stage[0].stage_name as string,
      cand[0].job_title as string,
      cand[0].company as string,
    );
    await pool.query(
      'UPDATE candidature_stages SET ai_prep = $1 WHERE id = $2',
      [JSON.stringify(result), req.params.stageId],
    );
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate interview prep.' });
  }
});

// ── PDF helpers ──────────────────────────────────────────────────────────────

function buildPdf(res: express.Response, filename: string, writeFn: (doc: any) => void): void {
  const PDFKit = require('pdfkit') as any;
  const doc = new PDFKit({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);
  writeFn(doc);
  doc.end();
}

function spPdfHeader(doc: any, jobTitle: string, company: string, subtitle: string): void {
  doc.fontSize(18).font('Helvetica-Bold').fillColor('#1a1a1a')
    .text('Workita — AI Interview Preparation', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(13).font('Helvetica').fillColor('#333')
    .text(`${jobTitle} at ${company}`, { align: 'center' });
  doc.fontSize(10).fillColor('#777')
    .text(subtitle, { align: 'center' });
  doc.moveDown(0.8);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#d0d0d0').stroke();
  doc.moveDown(0.8);
  doc.fillColor('#1a1a1a');
}

function spPdfStagePrep(doc: any, stage: { stage_name: string; status: string; notes?: string; scheduled_at?: string; completed_at?: string; ai_prep?: any }, stageFmt: string): void {
  const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a1a1a').text(stageFmt);
  doc.fontSize(10).font('Helvetica').fillColor('#555').text(`Status: ${stage.status}`);

  if (stage.scheduled_at) doc.text(`Scheduled: ${fmt(stage.scheduled_at)}`);
  if (stage.completed_at) doc.text(`Completed: ${fmt(stage.completed_at)}`);

  if (stage.notes) {
    doc.moveDown(0.4);
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#333').text('Notes');
    doc.fontSize(10).font('Helvetica').fillColor('#444').text(stage.notes, { lineGap: 3 });
  }

  const prep = stage.ai_prep ? (typeof stage.ai_prep === 'string' ? JSON.parse(stage.ai_prep) : stage.ai_prep) : null;

  if (prep) {
    doc.moveDown(0.6);
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a73e8').text('AI Interview Prep');
    doc.moveDown(0.2);
    doc.fontSize(10).font('Helvetica').fillColor('#333').text(prep.overview || '', { lineGap: 3 });

    if ((prep.questions || []).length) {
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#333').text('Practice Questions');
      (prep.questions as { question: string; tip: string; sampleAnswer: string }[]).forEach((q, i) => {
        doc.moveDown(0.4);
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a1a1a').text(`${i + 1}. ${q.question}`);
        doc.fontSize(9).font('Helvetica').fillColor('#1557b0').text(`Tip: ${q.tip}`, { lineGap: 2 });
        doc.fillColor('#444').text(q.sampleAnswer, { lineGap: 3 });
      });
    }
  } else {
    doc.moveDown(0.4);
    doc.fontSize(10).font('Helvetica').fillColor('#999').text('No AI prep generated for this stage yet.');
  }

  doc.fillColor('#1a1a1a');
}

// Single-stage PDF
app.get('/api/candidatures/:id/stages/:stageId/pdf', requireAuth, async (req, res) => {
  try {
    const userId = (req.user as { id: string }).id;
    const { rows: cand } = await pool.query(
      'SELECT job_title, company FROM candidatures WHERE id = $1 AND user_id = $2',
      [req.params.id, userId],
    );
    if (!cand[0]) { res.status(404).json({ error: 'Not found.' }); return; }

    const { rows: stages } = await pool.query(
      'SELECT stage_name, status, notes, scheduled_at, completed_at, ai_prep FROM candidature_stages WHERE id = $1 AND candidature_id = $2',
      [req.params.stageId, req.params.id],
    );
    if (!stages[0]) { res.status(404).json({ error: 'Stage not found.' }); return; }

    const stage = stages[0];
    const slug = (stage.stage_name as string).replace(/\s+/g, '-').toLowerCase();
    const filename = `workita-prep-${slug}.pdf`;

    buildPdf(res, filename, (doc) => {
      spPdfHeader(doc, cand[0].job_title as string, cand[0].company as string,
        `Generated on ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`);
      spPdfStagePrep(doc, stage, stage.stage_name as string);
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate PDF.' });
  }
});

// Full selection-process PDF
app.get('/api/candidatures/:id/pdf', requireAuth, async (req, res) => {
  try {
    const userId = (req.user as { id: string }).id;
    const { rows: cand } = await pool.query(
      'SELECT job_title, company, seniority, location, work_mode FROM candidatures WHERE id = $1 AND user_id = $2',
      [req.params.id, userId],
    );
    if (!cand[0]) { res.status(404).json({ error: 'Not found.' }); return; }

    const { rows: stages } = await pool.query(
      'SELECT stage_name, stage_order, status, notes, scheduled_at, completed_at, ai_prep FROM candidature_stages WHERE candidature_id = $1 ORDER BY stage_order ASC',
      [req.params.id],
    );

    const filename = `workita-selection-process-${(cand[0].company as string).replace(/\s+/g, '-').toLowerCase()}.pdf`;

    buildPdf(res, filename, (doc) => {
      const meta = [cand[0].seniority, cand[0].location, cand[0].work_mode].filter(Boolean).join(' · ');
      spPdfHeader(doc, cand[0].job_title as string, cand[0].company as string,
        `${meta ? meta + ' · ' : ''}Generated on ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`);

      // Overview table
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#333').text('Selection Process Overview');
      doc.moveDown(0.4);
      stages.forEach((s, i) => {
        doc.fontSize(10).font('Helvetica').fillColor('#444')
          .text(`${i + 1}. ${s.stage_name}`, { continued: true })
          .fillColor('#999').text(`  —  ${s.status}`);
      });

      // Detail per stage
      stages.forEach((s, i) => {
        doc.addPage();
        spPdfStagePrep(doc, s, `Stage ${i + 1}: ${s.stage_name}`);
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate PDF.' });
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

async function runMigrations() {
  await pool.query(`ALTER TABLE candidature_stages ADD COLUMN IF NOT EXISTS stage_order INTEGER NOT NULL DEFAULT 0`);
  await pool.query(`ALTER TABLE candidature_stages ADD COLUMN IF NOT EXISTS notes TEXT`);
  await pool.query(`ALTER TABLE candidature_stages ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE candidature_stages ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE candidature_stages ADD COLUMN IF NOT EXISTS ai_prep JSONB`);
}

runMigrations()
  .then(() => {
    app.listen(Number(port), () => {
      console.log(`Workita running on http://localhost:${port}`);
    });
  })
  .catch(err => {
    console.error('Migration failed', err);
    process.exit(1);
  });
