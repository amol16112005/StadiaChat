import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StadiaChat — WC2026 Stadium Ops AI",
  description:
    "Secure operational AI for FIFA World Cup 2026 stadium volunteers and Operations Leads: protocol FAQs, incident escalation, emergency SOPs, Fan Voice assist — tenancy-isolated per stadium.",
  keywords: [
    "FIFA World Cup 2026",
    "stadium operations",
    "volunteer AI",
    "incident management",
    "StadiaChat",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
