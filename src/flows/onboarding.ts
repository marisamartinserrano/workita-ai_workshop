import { googleAI } from '@genkit-ai/google-genai';
import { genkit, z } from 'genkit';

const ai = genkit({
    plugins: [googleAI()],
    // Optional. Specify a default model.
    model: googleAI.model('gemini-2.5-flash'),
});

const fetchJobPosting = ai.defineTool(
  {
    name: 'fetchJobPosting',
    description: 'Fetches the text content of a job posting from a URL. Use this to read the LinkedIn job description.',
    inputSchema: z.object({ url: z.string().describe('The job posting URL') }),
    outputSchema: z.string().describe('Extracted text content of the job posting'),
  },
  async ({ url }) => {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WorkitaBot/1.0)' },
      });
      const html = await res.text();
      return html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 8000);
    } catch (e) {
      return `Could not fetch URL: ${e instanceof Error ? e.message : String(e)}`;
    }
  }
);

const SYSTEM_PROMPT = `You are Workita, a friendly and professional AI job companion that guides candidates step by step through the job selection process.

Follow this onboarding flow in order:
1. GREET: Warmly introduce yourself as Workita and ask for the candidate's name.
2. ROLE: Once you have their name, address them by name and ask what role or position they are applying for.
3. LINKEDIN: Once you have their role, ask them to share the LinkedIn URL of the job position they are applying for.
4. ANALYZE: Once you have the LinkedIn URL, call fetchJobPosting with that URL to read the job description. Then produce a structured summary with these sections:
   - **Seniority level**: (e.g. Junior, Mid, Senior, Lead, Principal)
   - **Technical skills**: list of hard technical skills required
   - **Market/domain skills**: industry knowledge, tools, platforms, methodologies
   - **Soft skills**: interpersonal and behavioural skills
   - **Expected salary range**: extract from the posting if present; if not found, use your knowledge of typical market rates on Glassdoor, LinkedIn Salary, and similar sources to provide a researched estimate for that role, seniority level, and location — note that it is an estimate.
   Present the summary clearly, then ask the candidate to upload their CV.
5. CV: Ask them to upload their CV using the upload button below the chat.
6. CONFIRM: Once the CV is uploaded, acknowledge it warmly, confirm you have received it, and let them know you will guide them through the selection process.

Rules:
- Be concise, warm, and encouraging
- Always address the candidate by name once you have it
- Move to the next step only after receiving the required information
- Never skip steps
- At step 4, always call fetchJobPosting before producing the summary — do not guess the job content`;

export interface Message {
  role: 'user' | 'model';
  content: string;
}

export async function generateOnboardingResponse(messages: Message[]): Promise<string> {
  if (messages.length === 0) {
    const response = await ai.generate({
      system: SYSTEM_PROMPT,
      prompt: 'Begin the onboarding conversation.',
    });
    return response.text;
  }

  // History must start with a user message — drop leading model turns
  const prior = messages.slice(0, -1);
  const firstUserIdx = prior.findIndex(m => m.role === 'user');
  const history = (firstUserIdx === -1 ? [] : prior.slice(firstUserIdx)).map(m => ({
    role: m.role,
    content: [{ text: m.content || ' ' }],
  }));

  const lastMessage = messages[messages.length - 1];

  const response = await ai.generate({
    system: SYSTEM_PROMPT,
    messages: history.length > 0 ? history : undefined,
    prompt: lastMessage.content,
    tools: [fetchJobPosting],
  });

  return response.text;
}
