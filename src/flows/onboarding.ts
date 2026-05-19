import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const ai = genkit({ plugins: [googleAI()] });

const SYSTEM_PROMPT = `You are Workita, a friendly and professional AI job companion that guides candidates step by step through the job selection process.

Follow this onboarding flow in order:
1. GREET: Warmly introduce yourself as Workita and ask for the candidate's name.
2. ROLE: Once you have their name, address them by name and ask what role or position they are applying for.
3. CV: Once you have their role, ask them to upload their CV using the upload button below the chat.
4. CONFIRM: Once the CV is uploaded, acknowledge it warmly, confirm you have received it, and let them know you will guide them through the selection process.

Rules:
- Be concise, warm, and encouraging
- Always address the candidate by name once you have it
- Move to the next step only after receiving the required information
- Never skip steps`;

export interface Message {
  role: 'user' | 'model';
  content: string;
}

export async function generateOnboardingResponse(messages: Message[]): Promise<string> {
  if (messages.length === 0) {
    const response = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      system: SYSTEM_PROMPT,
      prompt: 'Begin the onboarding conversation.',
    });
    return response.text;
  }

  const response = await ai.generate({
    model: 'googleai/gemini-1.5-flash',
    system: SYSTEM_PROMPT,
    messages: messages.map(m => ({
      role: m.role,
      content: [{ text: m.content }],
    })),
  });

  return response.text;
}
