import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Liara Deployment & SRE Agent",
  description: "Autonomous deployment, monitoring, and troubleshooting agent for Liara Cloud",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur">
          <div className="container mx-auto flex h-16 items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 font-bold text-white shadow-lg shadow-blue-500/20">
                L
              </div>
              <div>
                <h1 className="text-base font-semibold leading-tight text-zinc-100">Liara Agent</h1>
                <p className="text-xs text-zinc-400">Autonomous Deployment & SRE Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                MVP v0.1.0
              </span>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}

