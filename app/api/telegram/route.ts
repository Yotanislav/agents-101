import { stepCountIs, streamText } from 'ai';
import { agentTools, DEFAULT_SYSTEM_PROMPT, model } from '../chat/agent';

export const maxDuration = 30;

type TelegramUpdate = {
  message?: {
    chat?: { id: number };
    text?: string;
  };
};

const TELEGRAM_MESSAGE_MAX_LENGTH = 4096;

async function sendTelegramMessage(
  chatId: number,
  text: string,
  token: string,
): Promise<void> {
  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    },
  );

  if (!response.ok) {
    console.error('Telegram sendMessage failed:', response.status, await response.text());
  }
}

export async function POST(req: Request) {
  let chatId: number | undefined;

  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.error('TELEGRAM_BOT_TOKEN is not set');
      return new Response('OK', { status: 200 });
    }

    const update = (await req.json()) as TelegramUpdate;
    chatId = update.message?.chat?.id;
    const text = update.message?.text?.trim();

    if (!chatId || !text) {
      return new Response('OK', { status: 200 });
    }

    const result = streamText({
      model,
      system: DEFAULT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: text }],
      tools: agentTools,
      stopWhen: stepCountIs(10),
    });

    const reply = (await result.text) || 'No pude generar una respuesta.';
    const message =
      reply.length > TELEGRAM_MESSAGE_MAX_LENGTH
        ? `${reply.slice(0, TELEGRAM_MESSAGE_MAX_LENGTH - 3)}...`
        : reply;

    await sendTelegramMessage(chatId, message, token);
  } catch (error) {
    console.error('Telegram webhook error:', error);

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (token && chatId) {
      try {
        await sendTelegramMessage(
          chatId,
          'Ocurrió un error al procesar tu mensaje. Inténtalo de nuevo más tarde.',
          token,
        );
      } catch {
        // Ignore secondary delivery failures; Telegram still gets 200.
      }
    }
  }

  return new Response('OK', { status: 200 });
}
