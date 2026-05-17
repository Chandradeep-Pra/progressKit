import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProgressKit AI",
  description: "AI analytics layer for Firebase progress metrics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full bg-[#f7f4ee] text-black">{children}</body>
    </html>
  );
}
