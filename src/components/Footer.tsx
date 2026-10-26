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
      className={`bg-[#fdfbf7] dark:bg-[#06130D]/80 border-t border-[#d4af37]/30 dark:border-[#d4af37]/20 py-4 text-center text-xs text-[#06130D]/75 dark:text-[#d4af37]/75 transition-colors duration-200 ${className}`}
    >
      {text}
    </footer>
  );
}

export default Footer;
