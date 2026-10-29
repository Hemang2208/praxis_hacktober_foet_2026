import "./globals.css";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Toaster } from "react-hot-toast";
import { ReduxProvider } from "@/redux/provider";
import {
  Geist,
  Geist_Mono,
  Montserrat,
  Playfair_Display,
  Space_Grotesk,
} from "next/font/google";
import { CloudinaryProvider } from "@/context/CloudinaryContext";
import { SupportSocketProvider } from "@/providers/SupportSocketProvider";
import AuthCacheCleaner from "@/components/AuthCacheCleaner";
import { DeveloperToolsBlocker } from "@/components/DeveloperToolsBlocker";
import JiraOAuthHandler from "@/components/JiraOAuthHandler";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Kiyo | Enterprise AI-Driven Project & Talent Management",
  description:
    "Kiyo is an AI-powered platform revolutionizing enterprise project management with autonomous task orchestration and integrated talent development. By simulating real-world scenarios, it bridges the gap between education and industry, empowering companies, colleges, and professionals to build practical skills and drive measurable outcomes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="overflow-x-clip">
      <ReduxProvider>
        <body
          className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} ${playfair.variable} ${spaceGrotesk.variable} font-sans antialiased overflow-x-clip`}
          suppressHydrationWarning
        >
          <CloudinaryProvider>
            <SupportSocketProvider>
              {children}
            </SupportSocketProvider>
          </CloudinaryProvider>
          <AuthCacheCleaner />
          <DeveloperToolsBlocker />
          <Suspense fallback={null}>
            <JiraOAuthHandler />
          </Suspense>
          <Toaster position="bottom-right" reverseOrder={false} />
          <script
            defer
            src="https://cloud.umami.is/script.js"
            data-website-id="093e15c3-73e9-4816-a305-782e371acad1"
          ></script>
        </body>
      </ReduxProvider>
    </html>
  );
}
