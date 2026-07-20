import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Worship Planner",
  description: "Sistema de escalação de equipes de louvor",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" style={{ overflowY: 'scroll' }}>
      <body className="antialiased" style={{ minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  );
}
