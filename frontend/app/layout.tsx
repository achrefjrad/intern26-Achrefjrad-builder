import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Website Builder",
  description: "One-Page Website Builder",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-indigo-600 hover:text-indigo-700 transition">
            Website Builder
          </Link>
          <div className="flex gap-4">
            <Link href="/" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">
              Éditeur Visuel
            </Link>
            <Link href="/assistant" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">
              Assistant IA
            </Link>
          </div>
        </nav>
        <main className="flex-1 pt-14">{children}</main>
      </body>
    </html>
  );
}
