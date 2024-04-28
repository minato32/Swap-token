import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Manrope, Space_Grotesk } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-label",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CrossChain Swap",
  description: "Swap tokens seamlessly across multiple blockchains",
  icons: {
    icon: "/Favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${plusJakartaSans.variable} ${manrope.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-screen font-body transition-weighted bg-[var(--color-bg)] text-[var(--color-text-primary)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
