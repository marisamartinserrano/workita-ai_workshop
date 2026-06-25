import { googleAI } from '@genkit-ai/google-genai';
import { genkit, z } from 'genkit';

const ai = genkit({
  plugins: [googleAI()],
  model: googleAI.model('gemini-2.5-flash'),
});

const InterviewPrepOutputSchema = z.object({
  overview: z.string(),
  questions: z.array(z.object({
    question: z.string(),
    tip: z.string(),
    sampleAnswer: z.string(),
  })),
});

export type InterviewPrepResult = z.infer<typeof InterviewPrepOutputSchema>;

const interviewPrepFlow = ai.defineFlow(
  {
    name: 'interviewPrepFlow',
    inputSchema: z.object({
      stageName: z.string(),
      jobTitle: z.string(),
      company: z.string(),
    }),
    outputSchema: InterviewPrepOutputSchema,
  },
  async ({ stageName, jobTitle, company }) => {
    const response = await ai.generate({
      output: { schema: InterviewPrepOutputSchema },
      prompt: `You are a senior career coach preparing a candidate for their "${stageName}" interview.

Role: ${jobTitle}
Company: ${company}
Interview Stage: ${stageName}

Return JSON with:
- overview: 2-3 sentences describing what to expect in this specific stage at ${company} for a ${jobTitle} role. Be concrete and company-specific.
- questions: Exactly 5 realistic interview questions for this stage, each with:
  - question: The interview question
  - tip: A specific, actionable tip on how to answer this question well for this role and company
  - sampleAnswer: A sample answer tailored to the ${jobTitle} role at ${company} (2-4 sentences, first-person, concrete)

Make questions realistic for "${stageName}" at ${company}. Be specific to the role and company, not generic.`,
    });
    return response.output as InterviewPrepResult;
  },
);

export async function generateInterviewPrep(
  stageName: string,
  jobTitle: string,
  company: string,
): Promise<InterviewPrepResult> {
  return interviewPrepFlow({ stageName, jobTitle, company });
}
