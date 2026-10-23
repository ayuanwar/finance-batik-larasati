'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Logo } from '@/components/Logo';

export default function HalamanMasuk() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const setTestAccount = (userEmail: string) => {
    setEmail(userEmail);
    setPassword('password123');
    setErrorMessage(null);
  };

  const handleMasuk = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const emailTrim = email.trim();
    if (!emailTrim || !password) {
      setErrorMessage('Silakan masukkan alamat email dan kata sandi Anda.');
      return;
    }

    setLoading(true);

    try {
      // 1. Otentikasi Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailTrim,
        password: password,
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setErrorMessage('Alamat email atau kata sandi yang Anda masukkan salah. Silakan periksa kembali.');
        } else {
          setErrorMessage(`Gagal masuk: ${authError.message}`);
        }
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setErrorMessage('Terjadi kendala saat memverifikasi sesi pengguna.');
        setLoading(false);
        return;
      }

      // 2. Periksa status aktif pengguna di tabel profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, nama_lengkap, peran, aktif')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setErrorMessage('Profil pengguna tidak ditemukan dalam basis data sistem.');
        setLoading(false);
        return;
      }

      // Jika akun dinonaktifkan
      if (!profile.aktif) {
        await supabase.auth.signOut();
        setErrorMessage('Akun Anda saat ini berstatus NONAKTIF. Silakan hubungi Direktur untuk mengaktifkan kembali akun Anda.');
        setLoading(false);
        return;
      }

      // 3. Login sukses -> arahkan ke Dashboard
      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem yang tidak terduga.';
      setErrorMessage(msg);
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#06130D] min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden font-sans text-slate-100 antialiased selection:bg-[#d4af37] selection:text-[#06130D] px-4 py-8">
      
      {/* =========================================================
           KARTU UTAMA DENGAN ATAP JOGLO KLASIK MINIMALIS & BERSIH
           ========================================================= */}
      <div className="relative z-10 w-full max-w-[480px] flex flex-col items-center my-auto drop-shadow-[0_20px_50px_rgba(0,0,0,0.9)]">
        
        {/* SVG ATAP JOGLO MINIMALIS TEGAS (BERSIH TANPA ORNAMEN SUDUT) */}
        <div className="w-full relative -mb-[7px] z-10 pointer-events-none">
          <svg
            viewBox="0 0 500 90"
            className="w-full h-auto block"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {/* 1. Siluet Utama Atap Joglo Bersih & Tegas */}
            <path
              d="
                M 70,82
                L 15,88
                C 12,89 12,87 14,86
                L 170,58
                L 205,24
                L 198,17
                L 204,21
                L 296,21
                L 302,17
                L 295,24
                L 330,58
                L 486,86
                C 488,87 488,89 485,88
                L 430,82
                Z
              "
              fill="#081a12"
              stroke="#d4af37"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* 2. Garis Rangka Dalam Arsitektur Joglo Bersih */}
            <path
              d="
                M 212,27
                L 288,27
                M 212,27
                L 178,59
                L 40,84
                M 288,27
                L 322,59
                L 460,84
              "
              fill="none"
              stroke="#d4af37"
              strokeWidth="1"
              opacity="0.8"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* PAPAN KARTU UTAMA DENGAN BINGKAI EMAS GANDA (DOUBLE BORDER) */}
        <div className="w-[72%] sm:w-[72%] bg-[#081a12] border-2 border-[#d4af37] border-t-0 p-2 sm:p-2.5 pb-6 flex flex-col items-center">
          
          {/* Bingkai Dalam Tipis (Inner Border Line) */}
          <div className="w-full border border-[#d4af37]/80 p-4 sm:p-5 flex flex-col items-center">
            
            {/* Header Judul Resmi Keraton dengan Logo Huruf 'B' Murni */}
            <div className="text-center mt-1 mb-5 flex flex-col items-center">
              <Logo
                variant="transparent-monogram"
                size="md"
                className="w-12 h-12 mb-2"
                priority
              />
              <h1 className="text-lg sm:text-xl font-serif font-bold text-[#d4af37] tracking-wide mb-1 drop-shadow-sm">
                CV Batik Larasati
              </h1>
              <p className="text-[#d4af37] text-[9.5px] sm:text-[10px] tracking-[0.22em] font-medium uppercase">
                Sistem Keuangan & Pembukuan
              </p>
            </div>

            {/* Kotak Formulir Masuk (Tanpa Header "Masuk ke Sistem", Langsung Field) */}
            <div className="w-full rounded-md border border-[#d4af37] bg-[#05140d] p-4 sm:p-5 shadow-inner">
              
              {/* Notifikasi Galat Jika Ada */}
              {errorMessage && (
                <div className="mb-3.5 p-2 rounded-md bg-rose-950/80 border border-rose-500/40 flex items-start gap-2 text-rose-200 text-xs animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span className="leading-snug">{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleMasuk} className="flex flex-col gap-3">
                {/* Field Alamat Email */}
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="email-input"
                    className="text-[9px] uppercase tracking-wider text-[#d4af37] font-bold"
                  >
                    Alamat Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[#d4af37]/60">
                      <Mail className="h-3.5 w-3.5" />
                    </div>
                    <input
                      id="email-input"
                      type="email"
                      placeholder="nama@larasati.test"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      className="w-full bg-[#030d08] border border-[#d4af37]/40 rounded-md pl-8 pr-3 py-1.5 sm:py-2 text-slate-100 outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all text-xs placeholder:text-slate-600 disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Field Kata Sandi */}
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="password-input"
                    className="text-[9px] uppercase tracking-wider text-[#d4af37] font-bold"
                  >
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[#d4af37]/60">
                      <Lock className="h-3.5 w-3.5" />
                    </div>
                    <input
                      id="password-input"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      className="w-full bg-[#030d08] border border-[#d4af37]/40 rounded-md pl-8 pr-8 py-1.5 sm:py-2 text-slate-100 outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all text-xs placeholder:text-slate-600 tracking-wider disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center cursor-pointer hover:text-[#d4af37] text-[#d4af37]/60 transition-colors focus:outline-none"
                      aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Tombol Masuk Solid Emas (Persis Gambar Referensi) */}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full flex items-center justify-center gap-2 bg-[#d4af37] hover:bg-[#c59e2e] active:bg-[#b58e23] text-[#06130D] font-bold text-xs uppercase tracking-widest py-2.5 rounded-md transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#06130D]" />
                      <span>Memverifikasi...</span>
                    </>
                  ) : (
                    <span>Masuk ke Akun</span>
                  )}
                </button>
              </form>

              {/* Uji Cepat Akun Demo (Discreet) */}
              <div className="mt-3.5 pt-2.5 border-t border-[#d4af37]/15">
                <span className="block text-[8px] uppercase tracking-wider text-[#d4af37]/70 font-semibold mb-1.5 text-center">
                  Pilih Akun Uji
                </span>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => setTestAccount('dimas@larasati.test')}
                    className="px-1.5 py-1 rounded bg-[#030d08] border border-[#d4af37]/25 hover:border-[#d4af37] text-[9px] text-slate-300 hover:text-[#d4af37] font-medium transition-colors text-center cursor-pointer"
                  >
                    Akuntan
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestAccount('laras@larasati.test')}
                    className="px-1.5 py-1 rounded bg-[#030d08] border border-[#d4af37]/25 hover:border-[#d4af37] text-[9px] text-slate-300 hover:text-[#d4af37] font-medium transition-colors text-center cursor-pointer"
                  >
                    Direktur
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestAccount('retno@larasati.test')}
                    className="px-1.5 py-1 rounded bg-[#030d08] border border-[#d4af37]/25 hover:border-[#d4af37] text-[9px] text-slate-300 hover:text-[#d4af37] font-medium transition-colors text-center cursor-pointer"
                  >
                    Staf
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Footer Hak Cipta Sederhana (Tanpa Tombol Panah Bawah) */}
        <p className="text-[10px] text-[#d4af37]/80 tracking-[0.2em] uppercase font-medium mt-4">
          © 2026 CV BATIK LARASATI
        </p>

      </div>
    </div>
  );
}
