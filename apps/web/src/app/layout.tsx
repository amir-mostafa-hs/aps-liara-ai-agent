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
      <body className="h-screen overflow-hidden bg-zinc-950 text-zinc-100 antialiased flex flex-col">
        {children}
      </body>
    </html>
  );
}

