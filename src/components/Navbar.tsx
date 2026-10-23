'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Sparkles, LogOut, Menu, X, Search, Loader2 } from 'lucide-react';
import { Profile } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { keluarAction } from '@/lib/actions/auth';
import { Logo } from '@/components/Logo';

interface NavbarProps {
  profile: Profile;
  onLogout?: () => Promise<void>;
}

export function Navbar({ profile, onLogout }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      if (onLogout) {
        await onLogout();
      } else {
        await keluarAction();
      }
    } catch {
      // Fallback aman jika terjadi kendala respon sesi server
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        // Abaikan error client signout
      }
      window.location.href = '/masuk';
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/cari?q=${encodeURIComponent(searchQuery.trim())}`);
    setMobileSearchOpen(false);
  };

  const isFinance = profile.peran === 'direktur' || profile.peran === 'akuntan';

  const roleBadgeStyle = {
    direktur: 'bg-[#1a382b] text-[#d4af37] border-[#d4af37]/60',
    akuntan: 'bg-[#0e2c38] text-sky-200 border-sky-400/40',
    staf: 'bg-[#123524] text-emerald-200 border-emerald-400/40',
  }[profile.peran] || 'bg-[#0c2419] text-slate-300 border-slate-700';

  const getLinkClasses = (href: string, exact: boolean = false) => {
    const isActive = exact
      ? pathname === href
      : pathname === href || (href !== '/' && pathname.startsWith(href));

    if (isActive) {
      return 'px-2 py-1 rounded-md bg-[#123524] text-[#d4af37] border border-[#d4af37]/50 font-bold whitespace-nowrap transition-all shadow-xs';
    }
    return 'px-2 py-1 rounded-md text-slate-300 hover:text-[#d4af37] hover:bg-[#0c2419] whitespace-nowrap transition-all font-medium';
  };

  const getMobileLinkClasses = (href: string, exact: boolean = false) => {
    const isActive = exact
      ? pathname === href
      : pathname === href || (href !== '/' && pathname.startsWith(href));

    if (isActive) {
      return 'block px-3 py-2 rounded-md bg-[#123524] text-[#d4af37] border border-[#d4af37]/50 font-bold text-xs';
    }
    return 'block px-3 py-2 rounded-md text-slate-300 hover:text-[#d4af37] hover:bg-[#0c2419] text-xs font-medium';
  };

  return (
    <header className="relative bg-[#071c15] border-b border-[#d4af37]/30 sticky top-0 z-30 shadow-md shadow-[#06130D]/80 overflow-hidden">
      {/* Latar Belakang Motif Batik Parang Mangkunegaran Asli (Persis Sesuai Gambar Referensi, Emas #d4af37, Opasitas 13%) */}
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

      <div className="relative z-10 w-full max-w-[1360px] mx-auto px-3 sm:px-5 lg:px-6">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* =========================================================
              BAGIAN KIRI: LOGO & MENU NAVIGASI
             ========================================================= */}
          <div className="flex items-center gap-3 xl:gap-5 min-w-0">
            {/* Logo Brand Keraton */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
              <div className="w-9 h-9 rounded-lg bg-[#071c14] flex items-center justify-center border border-[#d4af37]/40 group-hover:border-[#d4af37] transition-all shrink-0 p-1 shadow-xs">
                <Logo variant="transparent-monogram" size="xs" className="w-full h-full" priority />
              </div>
              <div className="flex flex-col justify-center">
                <span className="font-serif font-bold text-[#fdfbf7] text-xs sm:text-sm leading-tight tracking-tight whitespace-nowrap">
                  CV Batik Larasati
                </span>
                <span className="text-[9px] text-[#d4af37] font-semibold tracking-wider uppercase leading-tight whitespace-nowrap">
                  Keuangan & Akuntansi
                </span>
              </div>
            </Link>

            {/* Menu Navigasi Desktop Rapi & Ringkas */}
            <nav className="hidden lg:flex items-center gap-1 text-xs shrink-0">
              <Link href="/" className={getLinkClasses('/', true)}>
                Dashboard
              </Link>
              <Link href="/pengajuan" className={getLinkClasses('/pengajuan')}>
                Pengajuan
              </Link>

              {/* Menu Khusus Akuntan & Direktur */}
              {isFinance && (
                <>
                  <Link href="/jurnal" className={getLinkClasses('/jurnal')}>
                    Jurnal
                  </Link>
                  <Link href="/buku-besar" className={getLinkClasses('/buku-besar')}>
                    Buku Besar
                  </Link>
                  <Link href="/laporan-keuangan" className={getLinkClasses('/laporan-keuangan')}>
                    Lap. Keuangan
                  </Link>
                  <Link href="/akun-periode" className={getLinkClasses('/akun-periode')}>
                    Akun & Periode
                  </Link>
                  <Link href="/import-mutasi" className={getLinkClasses('/import-mutasi')}>
                    Import Mutasi
                  </Link>
                </>
              )}

              {/* Menu Khusus Direktur */}
              {profile.peran === 'direktur' && (
                <Link href="/pengguna-audit" className={getLinkClasses('/pengguna-audit')}>
                  Pengguna & Audit
                </Link>
              )}
            </nav>
          </div>

          {/* =========================================================
              BAGIAN KANAN: PROFIL, ROLE BADGE, KELUAR (TIDAK BERTUMPUK)
             ========================================================= */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 ml-auto">
            {/* Kolom Pencarian Global Ringkas */}
            <form onSubmit={handleSearchSubmit} className="relative hidden xl:block shrink-0 m-0">
              <Search className="w-3.5 h-3.5 text-[#d4af37] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari..."
                className="w-24 focus:w-36 pl-7 pr-2.5 py-1 text-xs rounded-md bg-[#05140e] border border-[#d4af37]/35 text-[#fdfbf7] placeholder-slate-400 focus:outline-none focus:border-[#d4af37] transition-all"
              />
            </form>

            {/* Tombol Pencarian untuk Layar Lebih Kecil */}
            <button
              type="button"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="p-1.5 rounded-md border border-[#d4af37]/30 text-[#d4af37] hover:bg-[#123524] xl:hidden cursor-pointer shrink-0"
              title="Pencarian"
              aria-label="Pencarian"
            >
              <Search className="w-3.5 h-3.5" />
            </button>

            {/* Garis Pemisah Vertikal Halus */}
            <div className="hidden sm:block h-6 w-px bg-[#d4af37]/25 shrink-0" />

            {/* Detail Profil Pengguna (Nama & Sub-Jabatan Rapi, Sejajar, Tidak Overlap) */}
            <div className="hidden sm:flex flex-col justify-center items-end text-right shrink-0">
              <span className="text-xs font-bold text-[#fdfbf7] leading-tight whitespace-nowrap">
                {profile.nama_lengkap}
              </span>
              <span className="text-[10px] text-[#d4af37] capitalize leading-tight whitespace-nowrap mt-0.5 font-medium">
                {profile.jabatan || profile.peran}
              </span>
            </div>

            {/* Lencana Peran (Role Badge) */}
            <span
              className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0 whitespace-nowrap ${roleBadgeStyle}`}
            >
              {profile.peran}
            </span>

            {/* Tombol Keluar (Terlindungi shrink-0, Akses Cepat & Aman) */}
            <form onSubmit={handleLogout} className="shrink-0 flex items-center m-0">
              <button
                type="submit"
                disabled={isLoggingOut}
                className="px-2.5 py-1.5 rounded-md bg-[#0b281e] border border-[#d4af37]/35 text-slate-200 hover:text-rose-300 hover:bg-rose-950/50 hover:border-rose-500/40 transition-colors text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50 shrink-0"
                title="Keluar dari Akun"
              >
                {isLoggingOut ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#d4af37]" />
                ) : (
                  <LogOut className="w-3.5 h-3.5 text-[#d4af37]" />
                )}
                <span className="hidden md:inline">
                  {isLoggingOut ? 'Keluar...' : 'Keluar'}
                </span>
              </button>
            </form>

            {/* Tombol Hamburger Mobile */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-md border border-[#d4af37]/35 text-slate-300 hover:text-[#d4af37] hover:bg-[#0b281e] lg:hidden cursor-pointer shrink-0"
              aria-label="Buka Menu Navigasi"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Bilah Pencarian Mobile Dropdown */}
        {mobileSearchOpen && (
          <div className="xl:hidden py-2 px-1 border-t border-[#d4af37]/20 bg-[#06150f]">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="w-4 h-4 text-[#d4af37] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari transaksi, pengajuan, nomor..."
                autoFocus
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md bg-[#081c15] border border-[#d4af37]/40 text-[#fdfbf7] placeholder-slate-400 focus:outline-none focus:border-[#d4af37]"
              />
            </form>
          </div>
        )}

        {/* Menu Drawer Mobile */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-2.5 border-t border-[#d4af37]/20 space-y-1 pb-3">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={getMobileLinkClasses('/', true)}
            >
              Dashboard
            </Link>
            <Link
              href="/pengajuan"
              onClick={() => setMobileMenuOpen(false)}
              className={getMobileLinkClasses('/pengajuan')}
            >
              Pengajuan
            </Link>

            {isFinance && (
              <>
                <Link
                  href="/jurnal"
                  onClick={() => setMobileMenuOpen(false)}
                  className={getMobileLinkClasses('/jurnal')}
                >
                  Jurnal Umum
                </Link>
                <Link
                  href="/buku-besar"
                  onClick={() => setMobileMenuOpen(false)}
                  className={getMobileLinkClasses('/buku-besar')}
                >
                  Buku Besar
                </Link>
                <Link
                  href="/laporan-keuangan"
                  onClick={() => setMobileMenuOpen(false)}
                  className={getMobileLinkClasses('/laporan-keuangan')}
                >
                  Laporan Keuangan
                </Link>
                <Link
                  href="/akun-periode"
                  onClick={() => setMobileMenuOpen(false)}
                  className={getMobileLinkClasses('/akun-periode')}
                >
                  Akun & Periode
                </Link>
                <Link
                  href="/import-mutasi"
                  onClick={() => setMobileMenuOpen(false)}
                  className={getMobileLinkClasses('/import-mutasi')}
                >
                  Import Mutasi
                </Link>
              </>
            )}

            {profile.peran === 'direktur' && (
              <Link
                href="/pengguna-audit"
                onClick={() => setMobileMenuOpen(false)}
                className={getMobileLinkClasses('/pengguna-audit')}
              >
                Pengguna & Audit Log
              </Link>
            )}

            {/* Opsi Keluar Mobile */}
            <div className="pt-2 border-t border-[#d4af37]/20 mt-1">
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full text-left px-2.5 py-1.5 rounded-md text-rose-300 hover:bg-rose-950/40 flex items-center gap-2 text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {isLoggingOut ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                ) : (
                  <LogOut className="w-3.5 h-3.5" />
                )}
                <span>{isLoggingOut ? 'Sedang Keluar...' : 'Keluar dari Akun'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
