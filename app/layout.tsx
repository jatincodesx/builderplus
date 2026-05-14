import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BuilderPlus",
  description: "Select ACT residential blocks and explore early feasibility."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
