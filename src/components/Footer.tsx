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
      className={`bg-[#ECE4B7] dark:bg-[#06130D]/80 border-t border-[#D3BC5F]/40 dark:border-[#D3BC5F]/20 py-4 text-center text-xs text-[#11301B]/80 dark:text-[#D3BC5F]/75 transition-colors duration-200 ${className}`}
    >
      {text}
    </footer>
  );
}

export default Footer;
