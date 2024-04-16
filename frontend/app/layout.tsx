import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CrossChain Swap",
  description: "Swap tokens seamlessly across multiple blockchains",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen transition-theme">
        {children}
      </body>
    </html>
  );
}
