import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { InferUITools, ToolSet, UIMessage } from 'ai';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { DEFAULT_SYSTEM_PROMPT } from './config';

export { DEFAULT_SYSTEM_PROMPT };

const google = createGoogleGenerativeAI();

export const model = google('gemini-2.5-flash');

export const agentTools = {
  research_docs: {
    description: 'Lee docs/knowledge_base.md y devuelve su contenido completo junto con el query original.',
    inputSchema: z.object({
      query: z.string().describe('Descripción breve de qué estás buscando'),
    }),
    execute: async ({ query }: { query: string }) => {
      try {
        const content = await readFile(join(process.cwd(), 'docs', 'knowledge_base.md'), 'utf-8');
        return { query, content };
      } catch {
        return { query, error: 'No se pudo leer docs/knowledge_base.md' };
      }
    },
  },
  consult_manual: {
    description: 'Lee docs/vibzer_manual.md y devuelve su contenido completo junto con el query original.',
    inputSchema: z.object({
      query: z.string().describe('Descripción breve de qué estás buscando en el manual de Vibzer'),
    }),
    execute: async ({ query }: { query: string }) => {
      try {
        const content = await readFile(join(process.cwd(), 'docs', 'vibzer_manual.md'), 'utf-8');
        return { query, content };
      } catch {
        return { query, error: 'No se pudo leer docs/vibzer_manual.md' };
      }
    },
  },
} satisfies ToolSet;

export type ChatUITools = InferUITools<typeof agentTools>;
export type ChatUIMessage = UIMessage<unknown, never, ChatUITools>;
