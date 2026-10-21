import React from 'react';
import Link from 'next/link';
import { Sparkles, LogOut } from 'lucide-react';
import { Profile } from '@/types/database';

interface NavbarProps {
  profile: Profile;
  onLogout: () => Promise<void>;
}

export function Navbar({ profile, onLogout }: NavbarProps) {
  const isFinance = profile.peran === 'direktur' || profile.peran === 'akuntan';

  const roleBadgeStyle = {
    direktur: 'bg-[#1a382b] text-[#f3c853] border-[#d4af37]/60 shadow-xs',
    akuntan: 'bg-[#0e2c38] text-sky-200 border-sky-400/40 shadow-xs',
    staf: 'bg-[#123524] text-emerald-200 border-emerald-400/40 shadow-xs',
  }[profile.peran] || 'bg-[#0c2419] text-slate-300 border-slate-700';

  return (
    <header className="bg-[#081c15]/95 backdrop-blur-md border-b border-[#d4af37]/25 sticky top-0 z-20 shadow-lg shadow-[#081c15]/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand Keraton */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-[#0f2d1e] text-[#d4af37] flex items-center justify-center shadow-md border border-[#d4af37]/40 group-hover:border-[#d4af37] transition-all">
                <Sparkles className="w-5 h-5 text-[#d4af37]" />
              </div>
              <div>
                <span className="font-extrabold text-[#fdfbf7] tracking-tight text-base sm:text-lg block leading-tight font-serif">
                  CV Batik Larasati
                </span>
                <span className="text-[11px] text-[#d4af37]/90 font-medium tracking-wide">
                  Keuangan & Akuntansi
                </span>
              </div>
            </Link>

            {/* Menu Navigasi Desktop Berdasarkan Peran (BR-11) */}
            <nav className="hidden md:flex items-center gap-1.5 text-xs font-semibold">
              <Link
                href="/"
                className="px-3.5 py-2 rounded-xl bg-[#123524] text-[#d4af37] border border-[#d4af37]/40 font-bold"
              >
                Dashboard
              </Link>
              <Link
                href="/pengajuan"
                className="px-3.5 py-2 rounded-xl text-slate-300 hover:text-[#d4af37] hover:bg-[#0c2419] transition-all"
              >
                Pengajuan
              </Link>

              {/* Menu Khusus Akuntan & Direktur (BR-11) */}
              {isFinance && (
                <>
                  <Link
                    href="/jurnal"
                    className="px-3.5 py-2 rounded-xl text-slate-300 hover:text-[#d4af37] hover:bg-[#0c2419] transition-all"
                  >
                    Jurnal Umum
                  </Link>
                  <Link
                    href="/buku-besar"
                    className="px-3.5 py-2 rounded-xl text-slate-300 hover:text-[#d4af37] hover:bg-[#0c2419] transition-all"
                  >
                    Buku Besar
                  </Link>
                  <Link
                    href="/laporan"
                    className="px-3.5 py-2 rounded-xl text-slate-300 hover:text-[#d4af37] hover:bg-[#0c2419] transition-all"
                  >
                    Laporan Keuangan
                  </Link>
                  <Link
                    href="/akun-periode"
                    className="px-3.5 py-2 rounded-xl text-slate-300 hover:text-[#d4af37] hover:bg-[#0c2419] transition-all"
                  >
                    Akun & Periode
                  </Link>
                </>
              )}

              {/* Menu Khusus Direktur (BR-12) */}
              {profile.peran === 'direktur' && (
                <Link
                  href="/pengguna-audit"
                  className="px-3.5 py-2 rounded-xl text-slate-300 hover:text-[#d4af37] hover:bg-[#0c2419] transition-all"
                >
                  Pengguna & Audit Log
                </Link>
              )}
            </nav>
          </div>

          {/* User Info & Tombol Keluar */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold text-[#fdfbf7] leading-snug">
                {profile.nama_lengkap}
              </div>
              <div className="text-xs text-[#d4af37]/80 capitalize">
                {profile.jabatan || profile.peran}
              </div>
            </div>

            <span className={`text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border ${roleBadgeStyle}`}>
              {profile.peran}
            </span>

            <form action={onLogout}>
              <button
                type="submit"
                className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-[#d4af37]/25 text-slate-300 hover:text-rose-300 hover:bg-rose-950/40 hover:border-rose-500/40 transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                title="Keluar dari Akun"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
