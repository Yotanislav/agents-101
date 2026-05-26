import { convertToModelMessages, stepCountIs, streamText } from 'ai';
import type { UIMessage } from 'ai';
import { agentTools, DEFAULT_SYSTEM_PROMPT, model } from './agent';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, systemPrompt }: { messages: UIMessage[]; systemPrompt?: string } =
    await req.json();

  const result = streamText({
    model,
    system: systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: agentTools,
    stopWhen: stepCountIs(10),
  });

  return result.toUIMessageStreamResponse();
}
