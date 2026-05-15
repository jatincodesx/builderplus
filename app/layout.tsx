import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BuilderPlus by Lumox Technologies",
  description:
    "BuilderPlus helps users find ACT blocks, draw plots, and explore house design fit.",
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png"
  }
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
