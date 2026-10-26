import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased bg-[#fdfbf7] dark:bg-[#06130D] overflow-x-hidden`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#fdfbf7] dark:bg-[#06130D] text-[#06130D] dark:text-[#fdfbf7] relative selection:bg-[#d4af37] selection:text-[#06130D] overflow-x-hidden w-full max-w-full transition-colors duration-200">
        {/* Konten Utama Aplikasi */}
        <div className="relative z-10 flex-1 flex flex-col w-full overflow-x-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}
