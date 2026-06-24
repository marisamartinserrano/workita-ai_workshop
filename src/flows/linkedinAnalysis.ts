import { googleAI } from '@genkit-ai/google-genai';
import { genkit, z } from 'genkit';

const ai = genkit({
  plugins: [googleAI()],
  model: googleAI.model('gemini-2.5-flash'),
});

const LinkedinAnalysisOutputSchema = z.object({
  recommendations: z.array(z.object({
    title: z.string(),
    rationale: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
  })).describe('LinkedIn profile improvement recommendations'),
  note: z.string().optional().describe('Optional note shown when no LinkedIn URL was provided'),
});

export type LinkedinAnalysisResult = z.infer<typeof LinkedinAnalysisOutputSchema>;

const linkedinAnalysisFlow = ai.defineFlow(
  {
    name: 'linkedinAnalysisFlow',
    inputSchema: z.object({
      cvText: z.string(),
      linkedinUrl: z.string().optional(),
      targetRole: z.string().optional(),
      seniority: z.string().optional(),
    }),
    outputSchema: LinkedinAnalysisOutputSchema,
  },
  async ({ cvText, linkedinUrl, targetRole, seniority }) => {
    const hasUrl = linkedinUrl && linkedinUrl.trim().length > 0;
    const roleCtx = [targetRole, seniority].filter(Boolean).join(', ');

    const prompt = `You are a LinkedIn profile expert and career coach. Based on the candidate's CV${hasUrl ? ` and their LinkedIn profile URL (${linkedinUrl})` : ''}, generate specific and actionable LinkedIn profile improvement recommendations.

CV TEXT:
${cvText}

${roleCtx ? `Target: ${roleCtx}` : ''}

Focus on:
1. Profile completeness (headline, summary, featured section)
2. Keyword optimisation for LinkedIn search and ATS filtering
3. Consistency between CV and LinkedIn
4. Recruiter search visibility
5. Skills section optimisation

Return JSON with:
- recommendations: array of improvements, each with:
  - title: short title of the recommendation
  - rationale: why this matters for recruiters/LinkedIn algorithms
  - priority: "high", "medium", or "low"
- note: ${hasUrl ? '""' : '"Note: For more specific recommendations, add your LinkedIn profile URL to your profile."'}

Be specific and actionable. Provide at least 5 recommendations.`;

    const response = await ai.generate({
      output: { schema: LinkedinAnalysisOutputSchema },
      prompt,
    });
    return response.output as LinkedinAnalysisResult;
  }
);

export async function analyzeLinkedin(
  cvText: string,
  linkedinUrl?: string,
  targetRole?: string,
  seniority?: string,
): Promise<LinkedinAnalysisResult> {
  return linkedinAnalysisFlow({ cvText, linkedinUrl, targetRole, seniority });
}
