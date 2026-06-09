import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Onboarding — Triad Vacation Rentals",
  description: "Complete your property onboarding with Triad.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={manrope.variable}>
      <body suppressHydrationWarning>
        <div className="grain" aria-hidden="true" />
        <div className="blue-glow" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
