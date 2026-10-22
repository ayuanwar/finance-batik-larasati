'use server';

import { createClient } from '@/lib/supabase/server';

export interface AkunDetail {
  id: number;
  kode: string;
  nama: string;
  tipe: 'aset' | 'kewajiban' | 'ekuitas' | 'pendapatan' | 'beban';
  saldo_normal: 'debit' | 'kredit';
  is_kas_bank: boolean;
  keterangan: string | null;
}

export interface MutasiBukuBesarRow {
  id: number;
  jurnal_id: number;
  nomor_jurnal: string | null;
  tanggal: string;
  keterangan_baris: string;
  keterangan_jurnal: string;
  sumber: string;
  debit: number;
  kredit: number;
  saldo_berjalan: number;
}

export interface BukuBesarResponseData {
  akun: AkunDetail;
  tanggal_mulai: string;
  tanggal_selesai: string;
  saldo_awal: number;
  mutasi: MutasiBukuBesarRow[];
  total_debit: number;
  total_kredit: number;
  saldo_akhir: number;
}

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface BukuBesarFilterPayload {
  akun_id: number;
  tanggal_mulai?: string;
  tanggal_selesai?: string;
}

/**
 * Server Action untuk mengambil data Buku Besar (General Ledger)
 * Hanya Akuntan dan Direktur yang berhak mengakses data keuangan ini.
 */
export async function getBukuBesarDataAction(
  payload: BukuBesarFilterPayload
): Promise<ActionResponse<BukuBesarResponseData>> {
  try {
    const supabase = await createClient();

    // 1. Verifikasi Sesi Pengguna
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Sesi Anda telah berakhir. Silakan masuk kembali.' };
    }

    // 2. Verifikasi Hak Akses Profil (Staf DILARANG mengakses data keuangan rahasia)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, peran, aktif')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.aktif) {
      return { success: false, error: 'Akun Anda tidak aktif atau tidak ditemukan.' };
    }

    if (profile.peran === 'staf') {
      return {
        success: false,
        error: 'Akses Ditolak: Anda tidak memiliki izin untuk melihat buku besar.',
      };
    }

    if (!payload.akun_id) {
      return { success: false, error: 'Akun harus dipilih.' };
    }

    // 3. Ambil Detail Akun Terpilih
    const { data: akun, error: akunErr } = await supabase
      .from('akun')
      .select('id, kode, nama, tipe, saldo_normal, is_kas_bank, keterangan')
      .eq('id', payload.akun_id)
      .single();

    if (akunErr || !akun) {
      return { success: false, error: 'Data akun tidak ditemukan.' };
    }

    const tanggalMulai = payload.tanggal_mulai || '';
    const tanggalSelesai = payload.tanggal_selesai || '';

    // 4. Hitung Saldo Awal (sebelum tanggal_mulai)
    // Sesuai aturan: Hanya ambil dari jurnal_baris yang terhubung dengan jurnal berstatus 'diposting'
    let saldoAwal = 0;
    if (tanggalMulai) {
      const { data: saldoAwalLines, error: saldoAwalErr } = await supabase
        .from('jurnal_baris')
        .select('debit, kredit, jurnal!inner(status, tanggal)')
        .eq('akun_id', payload.akun_id)
        .eq('jurnal.status', 'diposting')
        .lt('jurnal.tanggal', tanggalMulai);

      if (saldoAwalErr) {
        console.error('Error fetching saldo awal:', saldoAwalErr);
        return { success: false, error: 'Gagal menghitung saldo awal: ' + saldoAwalErr.message };
      }

      if (saldoAwalLines) {
        for (const line of saldoAwalLines) {
          const deb = Number(line.debit || 0);
          const kre = Number(line.kredit || 0);
          if (akun.saldo_normal === 'debit') {
            saldoAwal += deb - kre;
          } else {
            saldoAwal += kre - deb;
          }
        }
      }
    }

    // 5. Tarik Rincian Baris Jurnal dalam Rentang Tanggal (Mutasi Berjalan)
    let query = supabase
      .from('jurnal_baris')
      .select(`
        id,
        urutan,
        debit,
        kredit,
        keterangan,
        jurnal!inner(
          id,
          nomor,
          tanggal,
          keterangan,
          sumber,
          status
        )
      `)
      .eq('akun_id', payload.akun_id)
      .eq('jurnal.status', 'diposting');

    if (tanggalMulai) {
      query = query.gte('jurnal.tanggal', tanggalMulai);
    }
    if (tanggalSelesai) {
      query = query.lte('jurnal.tanggal', tanggalSelesai);
    }

    const { data: mutasiRaw, error: mutasiErr } = await query;

    if (mutasiErr) {
      console.error('Error fetching mutasi buku besar:', mutasiErr);
      return { success: false, error: 'Gagal mengambil mutasi buku besar: ' + mutasiErr.message };
    }

    // 6. Urutkan Mutasi Secara Kronologis
    const sortedMutasi = (mutasiRaw || []).slice().sort((a: any, b: any) => {
      const tglA = a.jurnal?.tanggal || '';
      const tglB = b.jurnal?.tanggal || '';
      if (tglA !== tglB) return tglA.localeCompare(tglB);

      const noA = a.jurnal?.nomor || '';
      const noB = b.jurnal?.nomor || '';
      if (noA !== noB) return noA.localeCompare(noB);

      const urutA = a.urutan || 0;
      const urutB = b.urutan || 0;
      if (urutA !== urutB) return urutA - urutB;

      return a.id - b.id;
    });

    // 7. Kalkulasi Saldo Berjalan Baris demi Baris
    let runningBalance = saldoAwal;
    let totalDebit = 0;
    let totalKredit = 0;

    const mutasiRows: MutasiBukuBesarRow[] = sortedMutasi.map((row: any) => {
      const deb = Number(row.debit || 0);
      const kre = Number(row.kredit || 0);

      totalDebit += deb;
      totalKredit += kre;

      if (akun.saldo_normal === 'debit') {
        runningBalance += deb - kre;
      } else {
        runningBalance += kre - deb;
      }

      const barisKet = (row.keterangan || '').trim();
      const jurnalKet = (row.jurnal?.keterangan || '').trim();

      return {
        id: row.id,
        jurnal_id: row.jurnal?.id,
        nomor_jurnal: row.jurnal?.nomor || null,
        tanggal: row.jurnal?.tanggal,
        keterangan_baris: barisKet || jurnalKet || '-',
        keterangan_jurnal: jurnalKet,
        sumber: row.jurnal?.sumber || 'manual',
        debit: deb,
        kredit: kre,
        saldo_berjalan: runningBalance,
      };
    });

    return {
      success: true,
      data: {
        akun: {
          id: akun.id,
          kode: akun.kode,
          nama: akun.nama,
          tipe: akun.tipe,
          saldo_normal: akun.saldo_normal,
          is_kas_bank: akun.is_kas_bank,
          keterangan: akun.keterangan,
        },
        tanggal_mulai: tanggalMulai,
        tanggal_selesai: tanggalSelesai,
        saldo_awal: saldoAwal,
        mutasi: mutasiRows,
        total_debit: totalDebit,
        total_kredit: totalKredit,
        saldo_akhir: runningBalance,
      },
    };
  } catch (err: unknown) {
    console.error('Unhandled error in getBukuBesarDataAction:', err);
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
    return { success: false, error: message };
  }
}
