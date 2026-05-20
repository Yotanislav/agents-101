import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "agents-101",
  description: "Aprende a construir agentes de IA con el AI SDK + Next.js",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
