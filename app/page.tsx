'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState } from 'react';
import { DEFAULT_SYSTEM_PROMPT } from './api/chat/config';
import type { ChatUIMessage } from './api/chat/agent';

// ── Tool call renderer ────────────────────────────────────────────────────────

type ToolCallBlockProps = {
  toolName: string;
  toolCallId: string;
  state: string;
  input: unknown;
  output?: unknown;
  errorText?: string;
};

function ToolCallBlock({ toolName, state, input, output, errorText, toolCallId }: ToolCallBlockProps) {
  const [open, setOpen] = useState(false);

  const isPending = state === 'input-streaming' || state === 'input-available';
  const isError = state === 'output-error';

  return (
    <div className="my-1 rounded-lg border border-foreground/15 bg-foreground/5 text-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 rounded-lg"
        aria-expanded={open}
        aria-controls={`tool-${toolCallId}`}
      >
        <span className="font-mono font-medium">{toolName}</span>
        {isPending && (
          <span className="ml-auto text-xs text-foreground/50 animate-pulse">ejecutando…</span>
        )}
        {isError && (
          <span className="ml-auto text-xs text-red-500">error</span>
        )}
        {!isPending && !isError && (
          <span className="ml-auto text-xs text-foreground/50">listo</span>
        )}
        <svg
          className={`h-3.5 w-3.5 shrink-0 text-foreground/40 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"
        >
          <path d="M8 10.5 L2 4.5 L14 4.5 Z" />
        </svg>
      </button>

      {open && (
        <div id={`tool-${toolCallId}`} className="border-t border-foreground/10 px-3 py-2 space-y-2">
          {state !== 'input-streaming' && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground/40 mb-1">Input</p>
              <pre className="whitespace-pre-wrap break-all text-xs">{JSON.stringify(input, null, 2)}</pre>
            </div>
          )}
          {output !== undefined && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground/40 mb-1">Output</p>
              <pre className="whitespace-pre-wrap break-all text-xs">{JSON.stringify(output, null, 2)}</pre>
            </div>
          )}
          {errorText && (
            <p className="text-xs text-red-500">{errorText}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Chat panel (remountable para reset) ──────────────────────────────────────

function ChatPanel({ systemPrompt }: { systemPrompt: string }) {
  const { messages, sendMessage, status } = useChat<ChatUIMessage>({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });
  const [input, setInput] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || status !== 'ready') return;
    sendMessage({ text }, { body: { systemPrompt } });
    setInput('');
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-foreground/40 mt-8">
            Envía un mensaje para empezar.
          </p>
        )}
        {messages.map(message => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                message.role === 'user'
                  ? 'bg-foreground text-background'
                  : 'bg-foreground/8 text-foreground'
              }`}
            >
              {message.parts.map((part, i) => {
                switch (part.type) {
                  case 'text':
                    return <p key={i} className="text-sm whitespace-pre-wrap">{part.text}</p>;
                  case 'tool-research_docs':
                    return (
                      <ToolCallBlock
                        key={part.toolCallId}
                        toolName="research_docs"
                        toolCallId={part.toolCallId}
                        state={part.state}
                        input={part.input}
                        output={'output' in part ? part.output : undefined}
                        errorText={'errorText' in part ? part.errorText : undefined}
                      />
                    );
                  case 'tool-consult_manual':
                    return (
                      <ToolCallBlock
                        key={part.toolCallId}
                        toolName="consult_manual"
                        toolCallId={part.toolCallId}
                        state={part.state}
                        input={part.input}
                        output={'output' in part ? part.output : undefined}
                        errorText={'errorText' in part ? part.errorText : undefined}
                      />
                    );
                  case 'dynamic-tool':
                    return (
                      <ToolCallBlock
                        key={part.toolCallId}
                        toolName={part.toolName}
                        toolCallId={part.toolCallId}
                        state={part.state}
                        input={part.input}
                        output={'output' in part ? part.output : undefined}
                        errorText={'errorText' in part ? part.errorText : undefined}
                      />
                    );
                  default:
                    return null;
                }
              })}
            </div>
          </div>
        ))}
        {status === 'streaming' && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-foreground/8 px-4 py-2.5">
              <span className="text-sm text-foreground/40 animate-pulse">…</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 border-t border-foreground/10 px-4 py-3"
      >
        <label htmlFor="chat-input" className="sr-only">Mensaje</label>
        <textarea
          id="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e as unknown as React.FormEvent);
            }
          }}
          placeholder="Escribe un mensaje… (Enter para enviar)"
          rows={1}
          className="flex-1 resize-none rounded-xl border border-foreground/20 bg-transparent px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 placeholder:text-foreground/30"
        />
        <button
          type="submit"
          disabled={!input.trim() || status !== 'ready'}
          className="rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [promptOpen, setPromptOpen] = useState(false);
  const [conversationKey, setConversationKey] = useState(0);

  function resetConversation() {
    setConversationKey(k => k + 1);
  }

  return (
    <main className="flex h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-foreground/10 px-4 py-3">
        <h1 className="text-base font-semibold tracking-tight">agents-101</h1>
        <button
          onClick={resetConversation}
          className="rounded-lg border border-foreground/20 px-3 py-1.5 text-xs font-medium text-foreground/70 hover:bg-foreground/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
        >
          Nueva conversación
        </button>
      </header>

      {/* System prompt editor */}
      <div className="border-b border-foreground/10 px-4">
        <button
          onClick={() => setPromptOpen(o => !o)}
          className="flex w-full items-center gap-2 py-2.5 text-left text-xs text-foreground/50 hover:text-foreground/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 rounded"
          aria-expanded={promptOpen}
          aria-controls="system-prompt-editor"
        >
          <svg
            className={`h-3 w-3 shrink-0 transition-transform ${promptOpen ? 'rotate-90' : ''}`}
            viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"
          >
            <path d="M6 4 L12 8 L6 12 Z" />
          </svg>
          System prompt
        </button>
        {promptOpen && (
          <div id="system-prompt-editor" className="pb-3 space-y-2">
            <label htmlFor="system-prompt" className="sr-only">System prompt</label>
            <textarea
              id="system-prompt"
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              rows={6}
              className="w-full resize-y rounded-lg border border-foreground/20 bg-foreground/5 px-3 py-2 font-mono text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
            />
            <p className="text-xs text-foreground/40">
              Los cambios aplican al próximo mensaje. Usa "Nueva conversación" para reiniciar.
            </p>
          </div>
        )}
      </div>

      {/* Chat */}
      <ChatPanel key={conversationKey} systemPrompt={systemPrompt} />
    </main>
  );
}
