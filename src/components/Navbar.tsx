'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Sparkles, LogOut, Menu, X, Search, Loader2 } from 'lucide-react';
import { Profile } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { keluarAction } from '@/lib/actions/auth';

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
      // Fallback aman jika terjadi error serialized response di server action
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
    direktur: 'bg-[#1a382b] text-[#f3c853] border-[#d4af37]/60 shadow-xs',
    akuntan: 'bg-[#0e2c38] text-sky-200 border-sky-400/40 shadow-xs',
    staf: 'bg-[#123524] text-emerald-200 border-emerald-400/40 shadow-xs',
  }[profile.peran] || 'bg-[#0c2419] text-slate-300 border-slate-700';

  const getLinkClasses = (href: string, exact: boolean = false) => {
    const isActive = exact
      ? pathname === href
      : pathname === href || (href !== '/' && pathname.startsWith(href));

    if (isActive) {
      return 'px-2.5 xl:px-3 py-1.5 rounded-xl bg-[#123524] text-[#d4af37] border border-[#d4af37]/40 font-bold whitespace-nowrap transition-all shadow-xs';
    }
    return 'px-2.5 xl:px-3 py-1.5 rounded-xl text-slate-300 hover:text-[#d4af37] hover:bg-[#0c2419] whitespace-nowrap transition-all';
  };

  const getMobileLinkClasses = (href: string, exact: boolean = false) => {
    const isActive = exact
      ? pathname === href
      : pathname === href || (href !== '/' && pathname.startsWith(href));

    if (isActive) {
      return 'block px-4 py-2.5 rounded-xl bg-[#123524] text-[#d4af37] border border-[#d4af37]/40 font-bold text-sm';
    }
    return 'block px-4 py-2.5 rounded-xl text-slate-300 hover:text-[#d4af37] hover:bg-[#0c2419] text-sm';
  };

  return (
    <header className="bg-[#06130D]/85 backdrop-blur-lg border-b border-[#C79F4B]/20 sticky top-0 z-30 shadow-lg shadow-[#06130D]/60">
      <div className="max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-3 sm:gap-6">
          {/* Logo & Brand Keraton */}
          <div className="flex items-center gap-4 xl:gap-8 shrink-0">
            <Link href="/" className="flex items-center gap-2.5 sm:gap-3 shrink-0 group">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#0f2d1e] text-[#d4af37] flex items-center justify-center border border-[#d4af37]/40 group-hover:border-[#d4af37] transition-all shrink-0 shadow-xs">
                <Sparkles className="w-5 h-5 text-[#d4af37]" />
              </div>
              <div className="flex flex-col justify-center">
                <span className="font-serif font-bold text-[#fdfbf7] text-sm sm:text-base leading-tight tracking-tight whitespace-nowrap">
                  CV Batik Larasati
                </span>
                <span className="text-[10px] sm:text-[11px] text-[#d4af37] font-semibold tracking-wider uppercase leading-tight whitespace-nowrap mt-0.5">
                  Keuangan & Akuntansi
                </span>
              </div>
            </Link>

            {/* Menu Navigasi Desktop Berdasarkan Peran */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 text-xs font-semibold shrink-0">
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
                    Jurnal Umum
                  </Link>
                  <Link href="/buku-besar" className={getLinkClasses('/buku-besar')}>
                    Buku Besar
                  </Link>
                  <Link href="/laporan-keuangan" className={getLinkClasses('/laporan-keuangan')}>
                    Laporan Keuangan
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
                  Pengguna & Audit Log
                </Link>
              )}
            </nav>
          </div>

          {/* User Info, Tombol Keluar, & Mobile Hamburger */}
          <div className="flex items-center gap-2.5 sm:gap-3 xl:gap-4 shrink-0">
            {/* Kolom Pencarian Global (Desktop / Tablet) */}
            <form onSubmit={handleSearchSubmit} className="relative hidden md:block shrink-0">
              <Search className="w-3.5 h-3.5 text-[#d4af37] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari transaksi, nomor..."
                className="w-36 lg:w-48 xl:w-56 pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[#06150f] border border-[#d4af37]/40 text-[#fdfbf7] placeholder-slate-400 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all"
              />
            </form>

            {/* Ikon Pencarian Mobile */}
            <button
              type="button"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="p-2 rounded-xl border border-[#d4af37]/30 text-[#d4af37] hover:bg-[#123524] md:hidden cursor-pointer shrink-0"
              title="Buka Pencarian Global"
              aria-label="Buka Pencarian Global"
            >
              <Search className="w-4 h-4" />
            </button>

            <div className="text-right hidden sm:flex flex-col justify-center shrink-0">
              <div className="text-xs sm:text-sm font-bold text-[#fdfbf7] leading-tight whitespace-nowrap">
                {profile.nama_lengkap}
              </div>
              <div className="text-[10px] sm:text-xs text-[#d4af37] capitalize leading-tight whitespace-nowrap mt-0.5">
                {profile.jabatan || profile.peran}
              </div>
            </div>

            <span className={`text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border shrink-0 whitespace-nowrap ${roleBadgeStyle}`}>
              {profile.peran}
            </span>

            <form onSubmit={handleLogout} className="shrink-0">
              <button
                type="submit"
                disabled={isLoggingOut}
                className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-[#d4af37]/25 text-slate-300 hover:text-rose-300 hover:bg-rose-950/40 hover:border-rose-500/40 transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50"
                title="Keluar dari Akun"
              >
                {isLoggingOut ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#d4af37]" />
                ) : (
                  <LogOut className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {isLoggingOut ? 'Keluar...' : 'Keluar'}
                </span>
              </button>
            </form>

            {/* Mobile Hamburger Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl border border-[#d4af37]/30 text-slate-300 hover:text-[#d4af37] lg:hidden cursor-pointer shrink-0"
              aria-label="Buka Menu Navigasi"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Global Search Dropdown / Input Bar */}
        {mobileSearchOpen && (
          <div className="md:hidden py-2.5 px-2 border-t border-[#d4af37]/20 bg-[#06150f]">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="w-4 h-4 text-[#d4af37] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari transaksi, pengajuan, nomor..."
                autoFocus
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#081c15] border border-[#d4af37]/40 text-[#fdfbf7] placeholder-slate-400 focus:outline-none focus:border-[#d4af37]"
              />
            </form>
          </div>
        )}

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-3 border-t border-[#d4af37]/20 space-y-1 pb-4">
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

            {/* Mobile Logout Option */}
            <div className="pt-2 border-t border-[#d4af37]/20 mt-2">
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full text-left px-2.5 py-2 rounded-xl text-rose-300 hover:bg-rose-950/40 flex items-center gap-2 text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {isLoggingOut ? (
                  <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                ) : (
                  <LogOut className="w-4 h-4" />
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
