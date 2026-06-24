import { googleAI } from '@genkit-ai/google-genai';
import { genkit, z } from 'genkit';

const ai = genkit({
  plugins: [googleAI()],
  model: googleAI.model('gemini-2.5-flash'),
});

const CvAnalysisOutputSchema = z.object({
  skills: z.array(z.string()).describe('Technical and soft skills extracted from the CV'),
  experience: z.array(z.string()).describe('Key experience highlights, one per role or achievement'),
  education: z.array(z.string()).describe('Education entries extracted from the CV'),
  gaps: z.array(z.string()).describe('Profile gaps or areas for improvement'),
  atsFeedback: z.array(z.object({
    item: z.string(),
    status: z.enum(['pass', 'warn', 'fail']),
    suggestion: z.string(),
  })).describe('ATS optimisation checklist items'),
});

export type CvAnalysisResult = z.infer<typeof CvAnalysisOutputSchema>;

const cvAnalysisFlow = ai.defineFlow(
  {
    name: 'cvAnalysisFlow',
    inputSchema: z.string().describe('CV text content'),
    outputSchema: CvAnalysisOutputSchema,
  },
  async (cvText) => {
    const response = await ai.generate({
      output: { schema: CvAnalysisOutputSchema },
      prompt: `You are an expert CV analyst and career coach. Analyse the following CV and return structured JSON.

CV TEXT:
${cvText}

Return JSON with:
- skills: array of all technical and soft skills you can identify
- experience: array of key experience highlights (one per role or major achievement, keep each concise)
- education: array of education entries
- gaps: array of specific, actionable profile gaps or areas for improvement (e.g. missing certifications, sparse metrics, no GitHub/portfolio link)
- atsFeedback: array of ATS optimisation checklist items, each with:
  - item: the ATS criterion checked
  - status: "pass", "warn", or "fail"
  - suggestion: what to do to improve (empty string if pass)

Be specific and actionable. Base everything strictly on the CV content provided.`,
    });
    return response.output as CvAnalysisResult;
  }
);

export async function analyzeCv(cvText: string): Promise<CvAnalysisResult> {
  return cvAnalysisFlow(cvText);
}

export async function isCvContent(text: string): Promise<boolean> {
  if (text.trim().length < 200) return false;
  const response = await ai.generate({
    prompt: `Does the following document appear to be a CV or resume? Look for: personal name, work experience, education, skills, or contact information. Reply with only "yes" or "no".\n\n${text.slice(0, 2000)}`,
  });
  return response.text.trim().toLowerCase().startsWith('yes');
}
