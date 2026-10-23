import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ایجنت هوشمند دپلوی و SRE لیارا | Liara AI Agent",
  description: "دستیار هوشمند و خودکار دپلوی، مدیریت منابع و عیب‌یابی در لیارا کلود",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className="dark">
      <body className="h-screen overflow-hidden bg-bg font-sans text-zinc-200 antialiased flex flex-col bg-[radial-gradient(50%_40%_at_70%_0%,rgba(44,196,244,.12),transparent)]">
        {children}
      </body>
    </html>
  );
}

