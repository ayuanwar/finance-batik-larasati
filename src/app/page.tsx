import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sparkles, LogOut, User, ShieldCheck, Briefcase, FileText, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function BerandaPage() {
  const supabase = await createClient();

  // 1. Periksa sesi pengguna
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/masuk');
  }

  // 2. Ambil profil pengguna
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

  const roleBadgeColor = {
    direktur: 'bg-amber-100 text-amber-800 border-amber-300',
    akuntan: 'bg-blue-100 text-blue-800 border-blue-300',
    staf: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  }[profile.peran as 'direktur' | 'akuntan' | 'staf'] || 'bg-slate-100 text-slate-800 border-slate-300';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar Sederhana */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-700 text-white flex items-center justify-center shadow-md shadow-amber-700/20">
              <Sparkles className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg block leading-tight">
                CV Batik Larasati
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Keuangan & Akuntansi
              </span>
            </div>
          </div>

          {/* User Info & Tombol Keluar */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-slate-800 leading-snug">
                {profile.nama_lengkap}
              </div>
              <div className="text-xs text-slate-500 capitalize">
                {profile.jabatan || profile.peran}
              </div>
            </div>

            <span className={`text-[11px] font-semibold uppercase px-2.5 py-1 rounded-full border ${roleBadgeColor}`}>
              {profile.peran}
            </span>

            <form action={handleKeluar}>
              <button
                type="submit"
                className="p-2 sm:px-3 sm:py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                title="Keluar dari Akun"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Konten Sambutan Selamat Datang */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-10 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60 mb-3">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Autentikasi Terverifikasi ({profile.peran.toUpperCase()})</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Selamat Datang, {profile.nama_lengkap}! 👋
              </h1>
              <p className="text-slate-600 text-sm mt-1.5 max-w-2xl leading-relaxed">
                Anda berhasil masuk ke sistem internal CV Batik Larasati. Akses halaman, data jurnal, dan pengajuan akan disesuaikan otomatis dengan hak otoritas peran Anda.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 text-amber-800 text-xs">
                <div className="font-semibold text-slate-900">Email Login:</div>
                <div className="font-mono text-slate-600">{profile.email}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Ringkasan Hak Akses Peran Saat Ini */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">Modul Pengajuan Biaya</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {profile.peran === 'staf'
                  ? 'Ajukan pengeluaran/reimburse baru, lampirkan bukti nota, dan pantau status persetujuan.'
                  : 'Tinjau, verifikasi kelengkapan nota, dan setujui pengajuan operasional UMKM.'}
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center text-xs font-semibold text-amber-700 gap-1">
              <span>Status: Siap Dibangun</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
                <Briefcase className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">Jurnal & Buku Besar</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {profile.peran === 'staf'
                  ? 'Akses dibatasi (Data keuangan perusahaan bersifat rahasia sesuai aturan BR-11).'
                  : 'Kelola draf jurnal, posting transaksi berimbang, dan mutasi saldo buku besar akun.'}
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center text-xs font-semibold text-blue-700 gap-1">
              <span>{profile.peran === 'staf' ? 'Akses Terkunci (RLS)' : 'Status: Siap Dibangun'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                <User className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">Laporan & Pengguna</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {profile.peran === 'direktur'
                  ? 'Buka kembali periode akuntansi, kelola status pengguna, dan audit log lengkap.'
                  : profile.peran === 'akuntan'
                  ? 'Laba rugi, neraca, dan penutupan periode akuntansi bulanan berurutan.'
                  : 'Ringkasan riwayat pengajuan milik pribadi.'}
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center text-xs font-semibold text-emerald-700 gap-1">
              <span>{profile.peran === 'staf' ? 'Akses Terkunci (RLS)' : 'Status: Siap Dibangun'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        CV Batik Larasati · Sistem Keuangan Internal UMKM Surakarta
      </footer>
    </div>
  );
}
