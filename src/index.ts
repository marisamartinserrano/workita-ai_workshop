import express from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { generateOnboardingResponse } from './flows/onboarding.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT ?? '8080';
const upload = multer({ dest: 'uploads/' });

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    const reply = await generateOnboardingResponse(messages ?? []);
    res.json({ reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

app.post('/api/upload', upload.single('cv'), (req, res) => {
  res.json({ success: true, filename: req.file?.originalname ?? 'unknown' });
});

app.listen(Number(port), () => {
  console.log(`Workita running on http://localhost:${port}`);
});
