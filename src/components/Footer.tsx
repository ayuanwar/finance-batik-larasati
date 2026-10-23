import React from 'react';

interface FooterProps {
  className?: string;
  text?: string;
}

export function Footer({
  className = '',
  text = '© 2026 CV Batik Larasati · Sistem Keuangan & Pembukuan Kas Keraton Surakarta',
}: FooterProps) {
  return (
    <footer
      className={`relative bg-[#071c15] border-t border-[#d4af37]/30 py-4 sm:py-5 text-center text-xs text-[#d4af37]/80 overflow-hidden shadow-inner ${className}`}
    >
      {/* Latar Belakang Motif Batik Parang Mangkunegaran (Emas #d4af37, Opasitas 13%) */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: "url('/batik-parang-gold.png?v=parang_mangkunegaran_v2')",
          backgroundRepeat: 'repeat',
          backgroundPosition: 'center',
          backgroundSize: '360px auto',
          opacity: 0.13,
        }}
        aria-hidden="true"
      />

      {/* Konten Teks Footer */}
      <div className="relative z-10 max-w-[1200px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3 text-[11px] sm:text-xs font-medium tracking-wide">
        <span className="font-serif font-bold text-[#d4af37]">
          CV Batik Larasati
        </span>
        <span className="hidden sm:inline text-[#d4af37]/40">·</span>
        <span className="text-[#d4af37]/75">
          Sistem Keuangan & Pembukuan Internal UMKM Surakarta
        </span>
        <span className="hidden sm:inline text-[#d4af37]/40">·</span>
        <span className="text-[#d4af37]/60 text-[10px] tracking-wider uppercase">
          © 2026
        </span>
      </div>
    </footer>
  );
}

export default Footer;
