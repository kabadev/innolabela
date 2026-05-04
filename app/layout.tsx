import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { AppProvider } from "@/context/AppContext";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Innovisal Audio Labeler App",
  description: "Created with Innovisal Audio Labeler",
  generator: "Innovisal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider >
      <html lang="en">
        <body
          className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}
        >
          <ErrorBoundary>
            <AppProvider>{children}</AppProvider>
          </ErrorBoundary>
          <Toaster richColors position="top-right" />
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
