import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MAPF Simulator - Multi-Agent Pathfinding",
  description:
    "Interactive Multi-Agent Pathfinding simulator with CBS and Prioritized Planning, animated visualization, conflict detection, and performance metrics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
