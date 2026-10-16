import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import FloatingContactBar from "@/components/FloatingContactBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Malnad Nest | Homestay & Travel Guide to Malnad, Karnataka",
    template: "%s | Malnad Nest",
  },
  description:
    "Plan a Malnad getaway with Malnad Nest. Explore Mudigere, Chikkamagaluru and Sakleshpur, discover Western Ghats viewpoints, coffee country and local travel tips, and browse homestay options.",
  keywords: [
    "Malnad Nest",
    "Malnad homestay",
    "Mudigere homestay",
    "places to visit in Mudigere",
    "Chikkamagaluru tourist places",
    "Chikkamagaluru homestay",
    "Sakleshpur tourist places",
    "Sakleshpur homestay",
    "Devaramane Hills",
    "Ethina Bhuja",
    "Mullayanagiri Peak",
    "Manjarabad Fort",
    "Western Ghats getaway Karnataka",
  ],
  applicationName: "Malnad Nest",
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <FloatingContactBar />
      </body>
    </html>
  );
}
