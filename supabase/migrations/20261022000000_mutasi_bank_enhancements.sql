-- ==============================================================================
-- MIGRATION: 20261022000000_mutasi_bank_enhancements.sql
-- Modul: Import Mutasi Bank (Tabel Perantara mutasi_bank)
-- ==============================================================================

-- 1. Tambahkan kolom pendukung jika belum ada
ALTER TABLE public.mutasi_bank 
  ADD COLUMN IF NOT EXISTS hash_transaksi TEXT;

ALTER TABLE public.mutasi_bank 
  ADD COLUMN IF NOT EXISTS akun_id BIGINT REFERENCES public.akun(id);

-- 2. Sinkronkan akun_id dengan akun_bank_id
UPDATE public.mutasi_bank 
SET akun_id = COALESCE(akun_id, akun_bank_id)
WHERE akun_id IS NULL;

-- 3. Isi hash_transaksi untuk data yang sudah ada (kombinasi unik akun_bank_id + tanggal + deskripsi + jumlah + saldo)
UPDATE public.mutasi_bank 
SET hash_transaksi = encode(sha256((akun_bank_id::text || '|' || tanggal::text || '|' || deskripsi || '|' || jumlah::text || '|' || COALESCE(saldo::text, '0'))::bytea), 'hex')
WHERE hash_transaksi IS NULL;

-- 4. Unique Index untuk hash_transaksi (mencegah impor ganda secara mutlak)
CREATE UNIQUE INDEX IF NOT EXISTS uq_mutasi_bank_hash ON public.mutasi_bank(hash_transaksi);

-- 5. Index pendukung performa query mutasi bank
CREATE INDEX IF NOT EXISTS idx_mutasi_bank_jurnal ON public.mutasi_bank(jurnal_id);
CREATE INDEX IF NOT EXISTS idx_mutasi_bank_tanggal ON public.mutasi_bank(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_mutasi_bank_akun ON public.mutasi_bank(akun_bank_id);
