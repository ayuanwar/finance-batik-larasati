import React from 'react';

interface MainCanvasProps {
  children: React.ReactNode;
  className?: string;
  wrapperClassName?: string;
  maxWidth?: string;
  id?: string;
}

/**
 * Komponen Kanvas Konten Utama Eksklusif
 * Menerapkan pola motif Batik Parang Mangkunegaran emas halus (#d4af37)
 * secara eksklusif hanya di dalam area kontainer konten utama (bukan global),
 * dengan latar hijau zamrud pekat (#071c15), sudut melengkung rounded-2xl,
 * border emas tipis, dan bayangan elegan.
 */
export function MainCanvas({
  children,
  className = '',
  wrapperClassName = '',
  maxWidth = 'max-w-[1200px]',
  id,
}: MainCanvasProps) {
  return (
    <div
      className={`flex-1 w-full mx-auto px-3 sm:px-5 lg:px-6 py-6 sm:py-8 flex flex-col overflow-x-hidden ${maxWidth} ${wrapperClassName}`}
    >
      <main
        id={id}
        className={`relative w-full bg-[#E9E9E1] dark:bg-[#071c15] text-[#11301B] dark:text-[#fdfbf7] border border-[#D3BC5F] dark:border-[#D3BC5F]/30 rounded-2xl shadow-md dark:shadow-2xl overflow-hidden px-4 sm:px-6 lg:px-8 pt-7 sm:pt-8 pb-6 sm:pb-8 flex-1 flex flex-col overflow-x-hidden transition-colors duration-200 ${className}`}
      >
        {/* Latar Belakang Motif Batik Parang Mangkunegaran Eksklusif Kanvas Konten Utama */}
        <div
          className="absolute inset-0 pointer-events-none z-0 print:hidden opacity-12 dark:opacity-20 transition-all duration-200"
          style={{
            backgroundImage: "url('/batik-parang-gold.png?v=parang_mangkunegaran_v2')",
            backgroundRepeat: 'repeat',
            backgroundPosition: 'center',
            backgroundSize: '360px auto',
          }}
          aria-hidden="true"
        />

        {/* Konten Halaman di Atas Kanvas */}
        <div className="relative z-10 w-full flex-1 overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}

export default MainCanvas;
