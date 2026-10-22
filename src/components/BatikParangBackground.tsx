'use client';

import React from 'react';

/**
 * Komponen Watermark Latar Belakang Batik Parang (Thin-line / Wireframe)
 * Menampilkan pola garis emas halus (#C79F4B) dengan opasitas rendah (12%)
 * di atas latar belakang Keraton (#06130D) tanpa mengganggu keterbacaan data.
 */
export function BatikParangBackground() {
  return (
    <svg
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ opacity: 0.12 }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="batikParangThin"
          x="0"
          y="0"
          width="140"
          height="200"
          patternUnits="userSpaceOnUse"
          patternTransform="scale(1.6) rotate(45)"
        >
          {/* Outline Luar */}
          <path
            d="M 60,15 C 110,15 120,85 85,155 C 65,195 25,175 35,135 C 50,80 20,30 60,15 Z"
            fill="none"
            stroke="#C79F4B"
            strokeWidth="0.8"
          />
          {/* Kontur Dalam */}
          <path
            d="M 55,30 C 95,30 100,85 75,140 C 60,175 35,165 45,135 C 55,100 35,50 55,30 Z"
            fill="none"
            stroke="#C79F4B"
            strokeWidth="0.4"
          />
          {/* Mlinjon (Lingkaran) */}
          <circle cx="120" cy="110" r="18" fill="none" stroke="#C79F4B" strokeWidth="0.8" />
          <circle cx="120" cy="110" r="10" fill="none" stroke="#C79F4B" strokeWidth="0.4" />
          {/* Isen-isen (Garis halus) */}
          <path d="M 15,80 L 35,100 L 15,120 L -5,100 Z" fill="none" stroke="#C79F4B" strokeWidth="0.5" />
          <path d="M 10,90 C 20,110 30,150 20,180" fill="none" stroke="#C79F4B" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#batikParangThin)" />
    </svg>
  );
}
