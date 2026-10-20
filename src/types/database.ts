// Tipe dan Definisi Data CV Batik Larasati Finance & Accounting

export type PeranPengguna = 'staf' | 'akuntan' | 'direktur';

export type TipeAkun = 'aset' | 'kewajiban' | 'ekuitas' | 'pendapatan' | 'beban';
export type SaldoNormal = 'debit' | 'kredit';

export type StatusPeriode = 'terbuka' | 'ditutup';

export type StatusJurnal = 'draf' | 'diposting' | 'dibalik';
export type SumberJurnal = 'saldo_awal' | 'manual' | 'pengajuan' | 'pembalik' | 'impor_bank';

export type JenisPengajuan = 'reimburse' | 'pengeluaran';
export type StatusPengajuan =
  | 'draf'
  | 'diajukan'
  | 'perlu_revisi'
  | 'menunggu_direktur'
  | 'disetujui'
  | 'ditolak'
  | 'dibayar'
  | 'dibatalkan';

export type JenisPenomoran = 'JU' | 'PG';

export interface Profile {
  id: string; // uuid FK to auth.users
  nama_lengkap: string;
  email: string;
  peran: PeranPengguna;
  jabatan: string | null;
  aktif: boolean;
  dibuat_pada: string;
}

export interface Akun {
  id: number;
  kode: string; // 4 digit (1xxx, 2xxx, 3xxx, 4xxx, 5xxx)
  nama: string;
  tipe: TipeAkun;
  saldo_normal: SaldoNormal;
  is_kas_bank: boolean;
  aktif: boolean;
  keterangan: string | null;
}

export interface Periode {
  id: number;
  tahun: number;
  bulan: number;
  tanggal_mulai: string;
  status: StatusPeriode;
  ditutup_oleh: string | null;
  ditutup_pada: string | null;
  alasan_buka_ulang: string | null;
}

export interface Jurnal {
  id: number;
  nomor: string | null; // JU-YYYYMM-NNNN (null jika masih draf)
  tanggal: string;
  periode_id: number;
  keterangan: string;
  sumber: SumberJurnal;
  status: StatusJurnal;
  pengajuan_id: number | null;
  jurnal_dibalik_id: number | null;
  dibuat_oleh: string;
  diposting_oleh: string | null;
  diposting_pada: string | null;
  dibuat_pada: string;
}

export interface JurnalBaris {
  id: number;
  jurnal_id: number;
  urutan: number;
  akun_id: number;
  debit: number; // BigInt di DB, number/string di TS
  kredit: number; // BigInt di DB, number/string di TS
  keterangan: string | null;
}

export interface Pengajuan {
  id: number;
  nomor: string; // PG-YYYYMM-NNN
  pengaju_id: string;
  jenis: JenisPengajuan;
  tanggal_transaksi: string;
  akun_beban_id: number;
  jumlah: number; // BigInt di DB (Rp10.000 - Rp25.000.000)
  keterangan: string;
  bukti_path: string;
  status: StatusPengajuan;
  catatan_peninjau: string | null;
  diajukan_pada: string | null;
  diverifikasi_oleh: string | null;
  diverifikasi_pada: string | null;
  disetujui_oleh: string | null;
  disetujui_pada: string | null;
  akun_kas_id: number | null;
  dibayar_oleh: string | null;
  dibayar_pada: string | null;
  dibuat_pada: string;
}

export interface Penomoran {
  jenis: JenisPenomoran;
  tahun: number;
  bulan: number;
  nomor_terakhir: number;
}

export interface AuditLog {
  id: number;
  waktu: string;
  pelaku_id: string;
  aksi: string;
  nama_tabel: string;
  id_data: string;
  data_lama: Record<string, unknown> | null;
  data_baru: Record<string, unknown> | null;
}

export interface MutasiBank {
  id: number;
  akun_bank_id: number;
  tanggal: string;
  deskripsi: string;
  jumlah: number;
  saldo: number | null;
  nama_file: string;
  jurnal_id: number | null;
  diimpor_oleh: string;
  diimpor_pada: string;
}
