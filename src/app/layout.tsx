import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StadiaChat — WC2026 Ops",
  description:
    "Secure operational communication for FIFA World Cup 2026 stadium volunteers and venue staff.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
