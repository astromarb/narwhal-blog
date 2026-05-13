import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "the wave · marvin a. lopez acevedo",
  description:
    "Field notes, paper margins, and quiet code — long-form writing from a geosciences PhD researcher.",
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
