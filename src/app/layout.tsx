import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthProvider from "./AuthProvider";
import { Toaster } from "../components/ui/toaster";
import ConditionalLayout from "../components/ConditionalLayout";
import { NotificationProvider } from "../context/NotificationContext";
import GeminiChatbot from "../components/GeminiChatbot";
import type { Metadata } from "next";

// Define comprehensive metadata for the root layout
export const metadata: Metadata = {
  title: {
    default: "University HRIS - Human Resource Information System",
    template: "%s | University HRIS"
  },
  description: "Comprehensive HR management platform for universities with payroll, leave management, and employee services",
  keywords: ["HRIS", "human resource", "university", "employee management", "payroll", "leave management"],
  authors: [{ name: "University HRIS Team" }],
  creator: "University HRIS Team",
  publisher: "University HRIS",
  icons: {
    icon: '/icon.svg',
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXTAUTH_URL || "http://localhost:3000",
    title: "University HRIS - Human Resource Information System",
    description: "Comprehensive HR management platform for universities with payroll, leave management, and employee services",
    siteName: "University HRIS",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "University HRIS Banner",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "University HRIS - Human Resource Information System",
    description: "Comprehensive HR management platform for universities with payroll, leave management, and employee services",
  },
  metadataBase: process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL) : undefined,
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <NotificationProvider>
            <ConditionalLayout>
              {children}
            </ConditionalLayout>
            <Toaster />
            <GeminiChatbot />
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
