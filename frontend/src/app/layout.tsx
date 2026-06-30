import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZK-PayLink",
  description: "Private, walletless payments on Stellar",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-950 text-slate-50">
        <main className="min-h-screen flex flex-col items-center justify-center p-8">
          {children}
        </main>
      </body>
    </html>
  );
}
