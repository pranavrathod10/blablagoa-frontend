import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BlaBlaGoa",
  description: "Meet people nearby. Chat for 5 minutes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
