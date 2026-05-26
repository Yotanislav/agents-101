export const maxDuration = 60;

import { Redis } from '@upstash/redis';
import { stepCountIs, streamText, type ModelMessage } from 'ai';
import { agentTools, DEFAULT_SYSTEM_PROMPT, model } from '../chat/agent';

type TelegramUpdate = {
  message?: {
    chat?: { id: number };
    text?: string;
  };
};

type StoredMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const TELEGRAM_MESSAGE_MAX_LENGTH = 4096;
const MAX_HISTORY_MESSAGES = 20;
const RETRY_FRIENDLY_MESSAGE =
  'Dame un momento, estoy procesando tu mensaje. Vuelve a escribirme en unos segundos 🙏';

function createRedis(): Redis | null {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    console.warn('[Telegram] KV_REST_API_URL or KV_REST_API_TOKEN is not set');
    return null;
  }

  return Redis.fromEnv();
}

function chatKey(chatId: number): string {
  return `chat:${chatId}`;
}

function trimHistory(messages: StoredMessage[]): StoredMessage[] {
  return messages.slice(-MAX_HISTORY_MESSAGES);
}

async function loadHistory(redis: Redis, chatId: number): Promise<StoredMessage[]> {
  const stored = await redis.get<StoredMessage[]>(chatKey(chatId));
  return Array.isArray(stored) ? stored : [];
}

async function saveHistory(
  redis: Redis,
  chatId: number,
  messages: StoredMessage[],
): Promise<void> {
  await redis.set(chatKey(chatId), trimHistory(messages));
}

async function sendChatAction(
  chatId: number,
  token: string,
  action: 'typing' = 'typing',
): Promise<void> {
  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendChatAction`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action }),
    },
  );

  if (!response.ok) {
    console.error('Telegram sendChatAction failed:', response.status, await response.text());
  }
}

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

async function generateAgentReply(messages: ModelMessage[]): Promise<string> {
  const attempt = async (): Promise<string> => {
    const result = streamText({
      model,
      system: DEFAULT_SYSTEM_PROMPT,
      messages,
      tools: agentTools,
      stopWhen: stepCountIs(10),
    });

    const reply = await result.text;
    if (!reply) {
      throw new Error('Empty agent response');
    }

    return reply;
  };

  try {
    return await attempt();
  } catch (firstError) {
    console.error('streamText failed, retrying once:', firstError);
    return await attempt();
  }
}

function truncateForTelegram(text: string): string {
  return text.length > TELEGRAM_MESSAGE_MAX_LENGTH
    ? `${text.slice(0, TELEGRAM_MESSAGE_MAX_LENGTH - 3)}...`
    : text;
}

export async function POST(req: Request) {
  let chatId: number | undefined;
  let token: string | undefined;

  try {
    token = process.env.TELEGRAM_BOT_TOKEN;
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

    await sendChatAction(chatId, token, 'typing');

    const redis = createRedis();
    const history = redis ? await loadHistory(redis, chatId) : [];
    const messages: ModelMessage[] = [
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: text },
    ];

    const reply = await generateAgentReply(messages);
    const message = truncateForTelegram(reply);

    if (redis) {
      const updatedHistory: StoredMessage[] = [
        ...history,
        { role: 'user', content: text },
        { role: 'assistant', content: reply },
      ];
      await saveHistory(redis, chatId, updatedHistory);
    }

    await sendTelegramMessage(chatId, message, token);
  } catch (error) {
    console.error('Telegram webhook error:', error);

    if (token && chatId) {
      try {
        await sendTelegramMessage(chatId, RETRY_FRIENDLY_MESSAGE, token);
      } catch {
        // Ignore secondary delivery failures; Telegram still gets 200.
      }
    }
  }

  return new Response('OK', { status: 200 });
}
