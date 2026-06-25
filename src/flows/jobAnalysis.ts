import { googleAI } from '@genkit-ai/google-genai';
import { genkit, z } from 'genkit';

const ai = genkit({
  plugins: [googleAI()],
  model: googleAI.model('gemini-2.5-flash'),
});

const JobAnalysisOutputSchema = z.object({
  company: z.object({
    name: z.string(),
    summary: z.string(),
    industry: z.string(),
    financialHealth: z.string(),
    recentNews: z.string(),
  }),
  role: z.object({
    title: z.string(),
    seniority: z.string(),
    location: z.string(),
    workMode: z.string(),
    industry: z.string(),
    skills: z.array(z.string()),
    experienceLevel: z.string(),
    salary: z.string(),
  }),
  matchPct: z.number().nullable(),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  differentiators: z.array(z.string()),
  atsKeywords: z.array(z.object({
    keyword: z.string(),
    tip: z.string(),
  })),
  cvRecommendations: z.array(z.string()),
  linkedinRecommendations: z.array(z.string()),
  networkingGuidance: z.array(z.string()),
});

export type JobAnalysisResult = z.infer<typeof JobAnalysisOutputSchema>;

const analyzeJobFlow = ai.defineFlow(
  {
    name: 'analyzeJobFlow',
    inputSchema: z.object({
      jobText: z.string(),
      cvText: z.string().optional(),
      targetRole: z.string().optional(),
      seniority: z.string().optional(),
    }),
    outputSchema: JobAnalysisOutputSchema,
  },
  async ({ jobText, cvText, targetRole, seniority }) => {
    const hasProfile = !!(cvText && cvText.trim().length > 100);

    const profileSection = hasProfile
      ? `\nCANDIDATE PROFILE:\n${cvText}${targetRole ? `\nTarget Role: ${targetRole}` : ''}${seniority ? `\nSeniority: ${seniority}` : ''}`
      : '\nNo candidate profile provided. Set matchPct to null and return empty arrays for strengths, gaps, and differentiators.';

    const response = await ai.generate({
      output: { schema: JobAnalysisOutputSchema },
      prompt: `You are a senior career coach and recruiter expert. Analyse the job description and candidate profile below.

JOB DESCRIPTION:
${jobText}
${profileSection}

Return JSON with:
- company: {name, summary (2-3 sentences), industry, financialHealth (1 sentence), recentNews (1 sentence or "Not available")}
- role: {title, seniority, location, workMode ("On-site"/"Hybrid"/"Remote"), industry, skills (8-12 required skills), experienceLevel (e.g. "5+ years"), salary (extracted or "Not specified")}
- matchPct: integer 0-100 if candidate profile provided, null otherwise
- strengths: 3-5 candidate strengths relevant to this role (empty array if no profile)
- gaps: 3-5 gaps between candidate and role requirements (empty array if no profile)
- differentiators: 2-3 things that make the candidate stand out (empty array if no profile)
- atsKeywords: 8-12 key ATS keywords from the job description, each with keyword and tip on how to incorporate it
- cvRecommendations: 4-6 specific CV optimisation recommendations for this role
- linkedinRecommendations: 4-6 specific LinkedIn profile recommendations for this role
- networkingGuidance: 4-5 actionable networking tips for the hiring team at this company

Be specific and actionable. Base everything strictly on the provided content.`,
    });

    return response.output as JobAnalysisResult;
  },
);

export async function analyzeJob(
  jobText: string,
  cvText?: string,
  targetRole?: string,
  seniority?: string,
): Promise<JobAnalysisResult> {
  return analyzeJobFlow({ jobText, cvText, targetRole, seniority });
}

const JobBasicsSchema = z.object({
  company: z.string(),
  job_title: z.string(),
  seniority: z.string(),
  location: z.string(),
  work_mode: z.string(),
  industry: z.string(),
});

export type JobBasics = z.infer<typeof JobBasicsSchema>;

const extractJobBasicsFlow = ai.defineFlow(
  {
    name: 'extractJobBasicsFlow',
    inputSchema: z.string(),
    outputSchema: JobBasicsSchema,
  },
  async (jobText) => {
    const response = await ai.generate({
      output: { schema: JobBasicsSchema },
      prompt: `Extract basic job posting information from the text below.

TEXT:
${jobText}

Return JSON with exactly these fields (use empty string if not clearly stated):
- company: company name
- job_title: job title or role name
- seniority: one of Junior / Mid / Senior / Lead / Principal / Manager / Director / VP / C-Level (empty if unclear)
- location: city or region (e.g. "London", "Remote (EU)")
- work_mode: one of On-site / Hybrid / Remote (empty if unclear)
- industry: industry sector (e.g. "Fintech", "SaaS", "Healthcare")

Return only what is clearly stated in the text. Do not guess.`,
    });
    return response.output as JobBasics;
  },
);

export async function extractJobBasics(jobText: string): Promise<JobBasics> {
  return extractJobBasicsFlow(jobText);
}
