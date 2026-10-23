import React from 'react';

interface FooterProps {
  className?: string;
  text?: string;
}

export function Footer({
  className = '',
  text = 'CV Batik Larasati · Sistem Keuangan Internal UMKM Surakarta',
}: FooterProps) {
  return (
    <footer
      className={`bg-[#06130D]/80 border-t border-[#d4af37]/20 py-4 text-center text-xs text-[#d4af37]/75 ${className}`}
    >
      {text}
    </footer>
  );
}

export default Footer;
