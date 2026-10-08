import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import { PreferencesProvider } from "@/components/PreferencesProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FlickerSwipe",
  description: "Your next favorite movie is just one FlickerSwipe away.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col bg-background text-foreground">
        <AuthSessionProvider>
          <PreferencesProvider>
            <Navbar />
            <div className="flex flex-1 flex-col">{children}</div>
            <Footer />
          </PreferencesProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
