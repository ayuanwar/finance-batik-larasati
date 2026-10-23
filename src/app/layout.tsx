import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BatikParangBackground } from "@/components/BatikParangBackground";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CV Batik Larasati — Keuangan & Akuntansi",
  description: "Aplikasi internal pencatatan pengeluaran, jurnal umum, dan laporan keuangan CV Batik Larasati",
  icons: {
    icon: "/favicon.png",
    apple: "/logo-monogram.png",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#06130D] text-slate-100 relative selection:bg-[#C79F4B] selection:text-[#06130D] overflow-x-hidden">
        {/* Background Batik Parang Wireframe Watermark */}
        <BatikParangBackground />
        
        {/* Konten Utama */}
        <div className="relative z-10 flex-1 flex flex-col w-full">
          {children}
        </div>
      </body>
    </html>
  );
}
