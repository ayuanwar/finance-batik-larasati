import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Search, ArrowLeft, FileText, BookOpen, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { MainCanvas } from '@/components/MainCanvas';

export const dynamic = 'force-dynamic';

interface CariPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function CariPage({ searchParams }: CariPageProps) {
  const supabase = await createClient();

  // 1. Verifikasi Sesi Pengguna
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/masuk');
  }

  // 2. Ambil Profil Pengguna
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.aktif) {
    redirect('/masuk');
  }

  // Server Action untuk Keluar (Logout)
  async function handleKeluar() {
    'use server';
    const supabaseServer = await createClient();
    await supabaseServer.auth.signOut();
    redirect('/masuk');
  }

  // 3. Resolusi Parameter Pencarian
  const resolvedParams = await searchParams;
  const kataKunci = (resolvedParams.q || '').trim();

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col font-sans">
      <Navbar profile={profile} onLogout={handleKeluar} />

      <MainCanvas maxWidth="max-w-5xl">
        {/* Tombol Kembali */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#d4af37] hover:text-[#f3c853] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dasbor</span>
          </Link>
        </div>

        {/* Panel Konten Utama Pencarian */}
        <div className="bg-[#0b2419] rounded-2xl border border-[#d4af37]/25 p-6 sm:p-8 shadow-xl">
          {/* Header */}
          <div className="flex items-center gap-3.5 pb-6 border-b border-[#d4af37]/20">
            <div className="w-12 h-12 rounded-xl bg-[#06150f] border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37] shadow-md">
              <Search className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#fdfbf7] font-serif tracking-tight">
                Pencarian Global
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Pusat penelusuran dokumen, pengajuan, dan transaksi akuntansi Batik Larasati.
              </p>
            </div>
          </div>

          {/* Banner Status Kata Kunci */}
          <div className="mt-6 p-4 rounded-xl bg-[#06150f] border border-[#d4af37]/30">
            {kataKunci ? (
              <div className="space-y-1">
                <p className="text-xs font-bold text-[#d4af37] uppercase tracking-wider">
                  Status Penelusuran
                </p>
                <p className="text-base sm:text-lg font-bold text-slate-100">
                  Menampilkan hasil pencarian untuk:{' '}
                  <span className="text-[#f3c853] font-mono underline decoration-[#d4af37]/60 underline-offset-4">
                    &quot;{kataKunci}&quot;
                  </span>
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                Silakan ketikkan kata kunci pada kolom pencarian di bagian atas untuk mulai mencari data.
              </p>
            )}
          </div>

          {/* Kotak Informasi Tahap Integrasi */}
          <div className="mt-6 p-5 rounded-xl bg-[#081c15] border border-[#d4af37]/20 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#d4af37]">
              <Clock className="w-4 h-4" />
              <span>Modul Integrasi Lanjutan Segera Hadir</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Pencarian global terpusat sedang disiapkan untuk menghubungkan data lintas modul secara real-time:
              dokumen pengajuan biaya, entri Jurnal Umum, akun Buku Besar, serta log audit transaksi.
            </p>
          </div>

          {/* Pintasan Modul yang Sudah Tersedia */}
          <div className="mt-8 pt-6 border-t border-[#d4af37]/20">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#d4af37] mb-3">
              Pencarian Langsung pada Modul Terkait
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href={`/pengajuan?q=${encodeURIComponent(kataKunci)}`}
                className="p-4 rounded-xl bg-[#06150f] border border-[#d4af37]/25 hover:border-[#d4af37] hover:bg-[#123524] transition-all group block"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-[#081c15] text-[#d4af37] border border-[#d4af37]/20 group-hover:border-[#d4af37]/40">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-200 group-hover:text-[#f3c853] transition-colors">
                      Daftar Pengajuan Biaya
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Telusuri nomor PG, nama staf pengaju, dan uraian nota
                    </p>
                  </div>
                </div>
              </Link>

              {profile.peran !== 'staf' && (
                <Link
                  href="/jurnal"
                  className="p-4 rounded-xl bg-[#06150f] border border-[#d4af37]/25 hover:border-[#d4af37] hover:bg-[#123524] transition-all group block"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-[#081c15] text-[#d4af37] border border-[#d4af37]/20 group-hover:border-[#d4af37]/40">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-200 group-hover:text-[#f3c853] transition-colors">
                        Jurnal Umum & Transaksi
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Telusuri nomor jurnal JU, deskripsi, dan mutasi debit/kredit
                      </p>
                    </div>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>
      </MainCanvas>
      <Footer />
    </div>
  );
}
