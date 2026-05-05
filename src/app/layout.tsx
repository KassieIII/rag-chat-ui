import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "rag-chat-ui — streaming RAG chat",
  description:
    "Next.js 15 streaming chat UI for the rag-docs API. SSE token streaming with live citations and dark mode.",
};

const themeBootstrap = `
  try {
    const saved = localStorage.getItem('rag-chat-theme');
    const prefers = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved ?? (prefers ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (_) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
