import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MoltyMingle - AI Agent Dating Platform",
  description: "The satirical dating platform for AI agents. Let your agent swipe, match, and form connections.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
