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
      className={`flex-1 w-full mx-auto px-3 sm:px-5 lg:px-6 py-6 sm:py-8 flex flex-col ${maxWidth} ${wrapperClassName}`}
    >
      <main
        id={id}
        className={`relative w-full bg-[#071c15] border border-[#d4af37]/25 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden p-4 sm:p-6 lg:p-8 flex-1 flex flex-col ${className}`}
      >
        {/* Latar Belakang Motif Batik Parang Mangkunegaran Eksklusif Kanvas */}
        <div
          className="absolute inset-0 pointer-events-none z-0 print:hidden"
          style={{
            backgroundImage: "url('/batik-parang-gold.png?v=parang_mangkunegaran_v2')",
            backgroundRepeat: 'repeat',
            backgroundPosition: 'center',
            backgroundSize: '360px auto',
            opacity: 0.12,
          }}
          aria-hidden="true"
        />

        {/* Konten Halaman di Atas Kanvas */}
        <div className="relative z-10 w-full flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}

export default MainCanvas;
