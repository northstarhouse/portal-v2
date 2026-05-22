import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Cardo } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const cardo = Cardo({ variable: "--font-serif", subsets: ["latin"], weight: ["400", "700"] });

export const metadata: Metadata = {
  title: "North Star Portal",
  description: "North Star House operations portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${cardo.variable} h-full`}>
      <body className="min-h-full flex">{children}</body>
    </html>
  );
}
