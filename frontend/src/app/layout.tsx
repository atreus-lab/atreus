import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Atreus Wallet",
  description: "Wallet with ZK-ready payment links on Stellar. Send, receive, swap, and create private payment links.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <body className="antialiased">
        <GoogleOAuthProvider clientId={clientId}>
          <main className="page">{children}</main>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
