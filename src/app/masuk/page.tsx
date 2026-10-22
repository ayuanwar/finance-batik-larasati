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
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

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
    <div className="bg-[#0A1812] min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden font-sans text-gray-200 antialiased selection:bg-[#C79F4B] selection:text-[#0A1812] px-4 py-8">
      {/* ==========================================
           SILUET GAPURA KIRI (LINE ART)
           ========================================== */}
      <svg
        className="fixed left-0 top-0 h-full w-[320px] sm:w-[400px] opacity-[0.22] pointer-events-none z-0"
        viewBox="0 0 400 1080"
        preserveAspectRatio="xMinYMax slice"
        aria-hidden="true"
      >
        <g stroke="#C79F4B" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <rect x="40" y="150" width="30" height="930" strokeWidth="1.5" />
          <path d="M 40 150 L 55 50 L 70 150 Z" strokeWidth="1.5" fill="#C79F4B" fillOpacity="0.1" />
          <rect x="220" y="300" width="20" height="780" strokeWidth="1.5" />
          <path d="M 220 300 L 230 220 L 240 300 Z" strokeWidth="1.5" fill="#C79F4B" fillOpacity="0.1" />
          <path d="M 70 250 Q 150 220 220 350" strokeWidth="2" />
          <path d="M 70 280 Q 130 250 220 400" strokeWidth="1.5" />
          <path d="M 70 200 Q 140 180 160 260 C 180 340 120 330 110 380" strokeWidth="1.5" />
          <path d="M 120 240 C 140 230 160 240 150 260 C 140 280 120 260 120 250" strokeWidth="1" />
          <path d="M 170 320 C 190 300 210 320 200 350" strokeWidth="1" />
        </g>
      </svg>

      {/* ==========================================
           SILUET GAPURA KANAN (MIRROR)
           ========================================== */}
      <svg
        className="fixed right-0 top-0 h-full w-[320px] sm:w-[400px] opacity-[0.22] pointer-events-none z-0 transform scale-x-[-1]"
        viewBox="0 0 400 1080"
        preserveAspectRatio="xMinYMax slice"
        aria-hidden="true"
      >
        <g stroke="#C79F4B" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <rect x="40" y="150" width="30" height="930" strokeWidth="1.5" />
          <path d="M 40 150 L 55 50 L 70 150 Z" strokeWidth="1.5" fill="#C79F4B" fillOpacity="0.1" />
          <rect x="220" y="300" width="20" height="780" strokeWidth="1.5" />
          <path d="M 220 300 L 230 220 L 240 300 Z" strokeWidth="1.5" fill="#C79F4B" fillOpacity="0.1" />
          <path d="M 70 250 Q 150 220 220 350" strokeWidth="2" />
          <path d="M 70 280 Q 130 250 220 400" strokeWidth="1.5" />
          <path d="M 70 200 Q 140 180 160 260 C 180 340 120 330 110 380" strokeWidth="1.5" />
          <path d="M 120 240 C 140 230 160 240 150 260 C 140 280 120 260 120 250" strokeWidth="1" />
          <path d="M 170 320 C 190 300 210 320 200 350" strokeWidth="1" />
        </g>
      </svg>

      {/* ==========================================
           MAIN FORM: BINGKAI GEBYOK UKIR JAWA
           ========================================== */}
      <div className="relative z-10 w-full max-w-[500px] min-h-[690px] flex items-center justify-center p-3 sm:p-5 drop-shadow-[0_20px_50px_rgba(0,0,0,0.7)] my-auto">
        {/* SVG BINGKAI GEBYOK (BACKGROUND) */}
        <svg
          className="absolute inset-0 w-full h-full drop-shadow-2xl pointer-events-none"
          viewBox="0 0 500 720"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="goldGebyok" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E5C773" />
              <stop offset="50%" stopColor="#C79F4B" />
              <stop offset="100%" stopColor="#8C6523" />
            </linearGradient>
          </defs>

          {/* Base Fill (Bentuk Utama Sketsel) */}
          <path
            d="
              M 30,700 
              L 30,280 
              C 30,240 50,220 90,220 
              L 130,220 
              C 170,220 180,180 180,140 
              L 180,120 
              C 180,70 210,40 250,40 
              C 290,40 320,70 320,120 
              L 320,140 
              C 320,180 330,220 370,220 
              L 410,220 
              C 450,220 470,240 470,280 
              L 470,700 Z"
            fill="#102219"
            stroke="url(#goldGebyok)"
            strokeWidth="2"
          />

          {/* Garis Ukiran Dalam 1 (Inner Border) */}
          <path
            d="
              M 45,690 
              L 45,285 
              C 45,255 60,235 90,235 
              L 140,235 
              C 175,235 195,195 195,145 
              L 195,125 
              C 195,85 220,55 250,55 
              C 280,55 305,85 305,125 
              L 305,145 
              C 305,195 325,235 360,235 
              L 410,235 
              C 440,235 455,255 455,285 
              L 455,690 Z"
            fill="none"
            stroke="url(#goldGebyok)"
            strokeWidth="1"
            opacity="0.6"
          />

          {/* Ornamen Ukiran Sudut Khas Jawa (Kanan & Kiri) */}
          <g fill="none" stroke="url(#goldGebyok)" strokeWidth="1.5" strokeLinecap="round">
            {/* Ukiran Sudut Kiri Undakan 1 */}
            <path d="M 45,285 C 60,285 70,270 70,250 C 70,275 85,285 105,285" opacity="0.8" />
            <circle cx="70" cy="285" r="3" fill="url(#goldGebyok)" />

            {/* Ukiran Sudut Kanan Undakan 1 */}
            <path d="M 455,285 C 440,285 430,270 430,250 C 430,275 415,285 395,285" opacity="0.8" />
            <circle cx="430" cy="285" r="3" fill="url(#goldGebyok)" />

            {/* Ukiran Tengah (Kubah) */}
            <path d="M 220,90 C 235,90 250,75 250,55 C 250,75 265,90 280,90" opacity="0.8" />
            <path d="M 235,110 C 245,110 250,95 250,85 C 250,95 255,110 265,110" opacity="0.6" />
            <circle cx="250" cy="95" r="2.5" fill="url(#goldGebyok)" />
          </g>
        </svg>

        {/* KONTEN FORM DI DALAM GEBYOK */}
        <div className="relative z-20 w-full px-7 sm:px-11 pt-28 pb-8 flex flex-col items-center">
          {/* Logo Monogram & Header */}
          <div className="flex flex-col items-center text-center mb-6">
            {/* Ikon Logo Emas Belah Ketupat */}
            <div className="w-11 h-11 rounded-sm bg-[#0A1812] border border-[#C79F4B]/60 flex items-center justify-center mb-4 rotate-45 shadow-[0_0_15px_rgba(199,159,75,0.25)]">
              <Sparkles className="w-5 h-5 -rotate-45 text-[#C79F4B]" />
            </div>

            {/* Tipografi Elegan */}
            <h1 className="text-[#C79F4B] text-2xl sm:text-3xl font-serif font-bold tracking-wide mb-1.5 drop-shadow-md">
              CV Batik Larasati
            </h1>
            <p className="text-[#C79F4B]/75 text-[10px] sm:text-[11px] tracking-[0.18em] font-medium uppercase max-w-[280px] leading-relaxed">
              Sistem Keuangan & Pembukuan Kas Keraton Surakarta
            </p>
          </div>

          {/* Form Card Wrapper (Lengkungan Santai / Lebih Kecil) */}
          <div className="w-full rounded-md p-5 sm:p-6 border border-[#C79F4B]/15 bg-[#0A1812]/50 backdrop-blur-sm shadow-xl">
            <div className="mb-5 pb-3 border-b border-[#C79F4B]/15">
              <h2 className="text-[#C79F4B] font-semibold text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#C79F4B]" />
                Masuk ke Sistem
              </h2>
              <p className="text-gray-400 text-xs mt-1">
                Gunakan email terdaftar dan kata sandi Anda.
              </p>
            </div>

            {/* Pesan Kesalahan */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-md bg-rose-950/80 border border-rose-500/40 flex items-start gap-2.5 text-rose-200 text-xs animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleMasuk} className="flex flex-col gap-4">
              {/* Input Email - Lengkungan Santai (rounded-md) */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="email-input"
                  className="text-[10px] uppercase tracking-wider text-[#C79F4B]/80 font-bold"
                >
                  Alamat Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#C79F4B]/50">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="email-input"
                    type="email"
                    placeholder="nama@larasati.test"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="w-full bg-[#08130E] border border-[#C79F4B]/30 rounded-md pl-9 pr-3.5 py-2 text-gray-200 outline-none focus:border-[#C79F4B] focus:ring-1 focus:ring-[#C79F4B] transition-all text-xs sm:text-sm placeholder:text-gray-600 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Input Password - Lengkungan Santai (rounded-md) */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="password-input"
                  className="text-[10px] uppercase tracking-wider text-[#C79F4B]/80 font-bold"
                >
                  Kata Sandi
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#C79F4B]/50">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="password-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full bg-[#08130E] border border-[#C79F4B]/30 rounded-md pl-9 pr-9 py-2 text-gray-200 outline-none focus:border-[#C79F4B] focus:ring-1 focus:ring-[#C79F4B] transition-all text-xs sm:text-sm placeholder:text-gray-600 tracking-wider disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer hover:text-[#C79F4B] text-[#C79F4B]/50 transition-colors focus:outline-none"
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button - Lengkungan Santai (rounded-md) */}
              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full flex items-center justify-center gap-2 bg-[#C79F4B] hover:bg-[#DAB565] active:bg-[#B38C3B] text-[#0A1812] font-bold text-xs uppercase tracking-widest py-3 rounded-md transition-all shadow-[0_4px_14px_0_rgba(199,159,75,0.25)] hover:shadow-[0_6px_20px_rgba(199,159,75,0.4)] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#0A1812]" />
                    <span>Memverifikasi...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    <span>Masuk ke Akun</span>
                  </>
                )}
              </button>
            </form>

            {/* Tombol Uji Cepat (Quick Access) */}
            <div className="mt-4 pt-3 border-t border-[#C79F4B]/10">
              <span className="block text-[9px] uppercase tracking-wider text-[#C79F4B]/60 font-semibold mb-2 text-center">
                Pilih Akun Uji Cepat
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setTestAccount('dimas@larasati.test')}
                  className="px-2 py-1.5 rounded-md bg-[#08130E] border border-[#C79F4B]/20 hover:border-[#C79F4B] text-[10px] text-gray-300 hover:text-[#C79F4B] font-medium transition-colors text-center cursor-pointer"
                >
                  Akuntan
                </button>
                <button
                  type="button"
                  onClick={() => setTestAccount('laras@larasati.test')}
                  className="px-2 py-1.5 rounded-md bg-[#08130E] border border-[#C79F4B]/20 hover:border-[#C79F4B] text-[10px] text-gray-300 hover:text-[#C79F4B] font-medium transition-colors text-center cursor-pointer"
                >
                  Direktur
                </button>
                <button
                  type="button"
                  onClick={() => setTestAccount('retno@larasati.test')}
                  className="px-2 py-1.5 rounded-md bg-[#08130E] border border-[#C79F4B]/20 hover:border-[#C79F4B] text-[10px] text-gray-300 hover:text-[#C79F4B] font-medium transition-colors text-center cursor-pointer"
                >
                  Staf
                </button>
              </div>
            </div>
          </div>

          {/* Footer Text (Tanpa tag br) */}
          <div className="mt-6 text-center flex flex-col gap-0.5">
            <span className="text-[10px] text-[#C79F4B]/60 tracking-wider uppercase font-medium">
              © 2026 CV Batik Larasati - Surakarta
            </span>
            <span className="text-[9px] text-[#C79F4B]/40 tracking-wider uppercase">
              Aplikasi internal operasional UMKM.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
