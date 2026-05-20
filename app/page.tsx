export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="max-w-xl text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          agents-101
        </h1>
        <p className="mt-3 text-sm text-foreground/70 sm:text-base">
          Scaffold listo. Próximo paso: conectar el AI SDK y construir el
          agente.
        </p>
      </div>

      <ol className="list-decimal space-y-1 text-sm text-foreground/80 sm:text-base">
        <li>
          Copia <code className="rounded bg-foreground/10 px-1.5 py-0.5">.env.local.example</code>{" "}
          a <code className="rounded bg-foreground/10 px-1.5 py-0.5">.env.local</code> y agrega tu{" "}
          <code className="rounded bg-foreground/10 px-1.5 py-0.5">GOOGLE_GENERATIVE_AI_API_KEY</code>.
        </li>
        <li>Crea el route handler en <code className="rounded bg-foreground/10 px-1.5 py-0.5">app/api/chat/route.ts</code>.</li>
        <li>Conecta la UI con <code className="rounded bg-foreground/10 px-1.5 py-0.5">useChat</code>.</li>
      </ol>
    </main>
  );
}
