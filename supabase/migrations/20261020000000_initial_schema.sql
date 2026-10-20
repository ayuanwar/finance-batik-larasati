-- ==============================================================================
-- MIGRASI DATABASE FINANCE & ACCOUNTING CV BATIK LARASATI
-- Berdasarkan PRD_Finance.docx.md & ERD_Finance.pdf
-- ==============================================================================

-- 1. ENUMERASI DATA (ENUMS)
-- ------------------------------------------------------------------------------
CREATE TYPE peran_pengguna AS ENUM ('staf', 'akuntan', 'direktur');
CREATE TYPE tipe_akun AS ENUM ('aset', 'kewajiban', 'ekuitas', 'pendapatan', 'beban');
CREATE TYPE saldo_normal AS ENUM ('debit', 'kredit');
CREATE TYPE status_periode AS ENUM ('terbuka', 'ditutup');
CREATE TYPE status_jurnal AS ENUM ('draf', 'diposting', 'dibalik');
CREATE TYPE sumber_jurnal AS ENUM ('saldo_awal', 'manual', 'pengajuan', 'pembalik', 'impor_bank');
CREATE TYPE jenis_pengajuan AS ENUM ('reimburse', 'pengeluaran');
CREATE TYPE status_pengajuan AS ENUM (
  'draf',
  'diajukan',
  'perlu_revisi',
  'menunggu_direktur',
  'disetujui',
  'ditolak',
  'dibayar',
  'dibatalkan'
);

-- ==============================================================================
-- 2. DDL TABEL-TABEL UTAMA (9 TABEL SESUAI ERD)
-- ==============================================================================

-- 2.1 TABEL PROFILES (Terhubung 1-to-1 dengan auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nama_lengkap TEXT NOT NULL CHECK (char_length(nama_lengkap) >= 3),
  email TEXT NOT NULL UNIQUE,
  peran peran_pengguna NOT NULL DEFAULT 'staf',
  jabatan TEXT,
  aktif BOOLEAN NOT NULL DEFAULT TRUE,
  dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2 TABEL AKUN (Bagan Akun / Chart of Accounts)
CREATE TABLE akun (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  kode TEXT NOT NULL UNIQUE CHECK (kode ~ '^[1-5][0-9]{3}$'),
  nama TEXT NOT NULL CHECK (char_length(nama) >= 3),
  tipe tipe_akun NOT NULL,
  saldo_normal saldo_normal NOT NULL,
  is_kas_bank BOOLEAN NOT NULL DEFAULT FALSE,
  aktif BOOLEAN NOT NULL DEFAULT TRUE,
  keterangan TEXT,
  CONSTRAINT chk_kas_bank_hanya_aset CHECK (NOT is_kas_bank OR tipe = 'aset'),
  CONSTRAINT chk_saldo_normal_tipe CHECK (
    (tipe IN ('aset', 'beban') AND saldo_normal = 'debit') OR
    (tipe IN ('kewajiban', 'ekuitas', 'pendapatan') AND saldo_normal = 'kredit')
  )
);

-- 2.3 TABEL PERIODE (Periode Akuntansi Bulanan)
CREATE TABLE periode (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  tahun INT NOT NULL,
  bulan INT NOT NULL CHECK (bulan BETWEEN 1 AND 12),
  tanggal_mulai DATE NOT NULL,
  status status_periode NOT NULL DEFAULT 'terbuka',
  ditutup_oleh UUID REFERENCES profiles(id),
  ditutup_pada TIMESTAMPTZ,
  alasan_buka_ulang TEXT CHECK (alasan_buka_ulang IS NULL OR char_length(alasan_buka_ulang) >= 20),
  CONSTRAINT uq_periode_tahun_bulan UNIQUE (tahun, bulan)
);

-- 2.4 TABEL PENOMORAN (Penghitung Gapless JU & PG)
CREATE TABLE penomoran (
  jenis TEXT NOT NULL CHECK (jenis IN ('JU', 'PG')),
  tahun INT NOT NULL,
  bulan INT NOT NULL CHECK (bulan BETWEEN 1 AND 12),
  nomor_terakhir INT NOT NULL DEFAULT 0 CHECK (nomor_terakhir >= 0),
  PRIMARY KEY (jenis, tahun, bulan)
);

-- 2.5 TABEL PENGAJUAN (Pengeluaran dan Reimburse Karyawan)
CREATE TABLE pengajuan (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nomor TEXT NOT NULL UNIQUE,
  pengaju_id UUID NOT NULL REFERENCES profiles(id),
  jenis jenis_pengajuan NOT NULL,
  tanggal_transaksi DATE NOT NULL,
  akun_beban_id BIGINT NOT NULL REFERENCES akun(id),
  jumlah BIGINT NOT NULL CHECK (jumlah BETWEEN 10000 AND 25000000),
  keterangan TEXT NOT NULL CHECK (char_length(keterangan) >= 10),
  bukti_path TEXT,
  status status_pengajuan NOT NULL DEFAULT 'draf',
  catatan_peninjau TEXT CHECK (catatan_peninjau IS NULL OR char_length(catatan_peninjau) >= 10),
  diajukan_pada TIMESTAMPTZ,
  diverifikasi_oleh UUID REFERENCES profiles(id),
  diverifikasi_pada TIMESTAMPTZ,
  disetujui_oleh UUID REFERENCES profiles(id),
  disetujui_pada TIMESTAMPTZ,
  akun_kas_id BIGINT REFERENCES akun(id),
  dibayar_oleh UUID REFERENCES profiles(id),
  dibayar_pada TIMESTAMPTZ,
  dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.6 TABEL JURNAL (Kepala Jurnal Umum)
CREATE TABLE jurnal (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nomor TEXT UNIQUE,
  tanggal DATE NOT NULL,
  periode_id BIGINT NOT NULL REFERENCES periode(id),
  keterangan TEXT NOT NULL CHECK (char_length(keterangan) >= 5),
  sumber sumber_jurnal NOT NULL DEFAULT 'manual',
  status status_jurnal NOT NULL DEFAULT 'draf',
  pengajuan_id BIGINT UNIQUE REFERENCES pengajuan(id),
  jurnal_dibalik_id BIGINT UNIQUE REFERENCES jurnal(id),
  dibuat_oleh UUID NOT NULL REFERENCES profiles(id),
  diposting_oleh UUID REFERENCES profiles(id),
  diposting_pada TIMESTAMPTZ,
  dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.7 TABEL JURNAL_BARIS (Baris Debit Kredit Jurnal)
CREATE TABLE jurnal_baris (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  jurnal_id BIGINT NOT NULL REFERENCES jurnal(id) ON DELETE CASCADE,
  urutan SMALLINT NOT NULL DEFAULT 1,
  akun_id BIGINT NOT NULL REFERENCES akun(id),
  debit BIGINT NOT NULL DEFAULT 0 CHECK (debit >= 0),
  kredit BIGINT NOT NULL DEFAULT 0 CHECK (kredit >= 0),
  keterangan TEXT,
  CONSTRAINT chk_debit_atau_kredit CHECK (
    (debit > 0 AND kredit = 0) OR (kredit > 0 AND debit = 0)
  )
);

-- 2.8 TABEL AUDIT_LOG (Pencatatan Aksi Sensitif)
CREATE TABLE audit_log (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  waktu TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pelaku_id UUID REFERENCES profiles(id),
  aksi TEXT NOT NULL,
  nama_tabel TEXT NOT NULL,
  id_data TEXT NOT NULL,
  data_lama JSONB,
  data_baru JSONB
);

-- 2.9 TABEL MUTASI_BANK (Opsional: Rekonsiliasi Bank)
CREATE TABLE mutasi_bank (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  akun_bank_id BIGINT NOT NULL REFERENCES akun(id),
  tanggal DATE NOT NULL,
  deskripsi TEXT NOT NULL,
  jumlah BIGINT NOT NULL CHECK (jumlah <> 0),
  saldo BIGINT,
  nama_file TEXT NOT NULL,
  jurnal_id BIGINT REFERENCES jurnal(id),
  diimpor_oleh UUID NOT NULL REFERENCES profiles(id),
  diimpor_pada TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_mutasi_bank UNIQUE (akun_bank_id, tanggal, deskripsi, jumlah, saldo)
);

-- ==============================================================================
-- 3. INDEX UNTUK PERFORMA QUERY
-- ==============================================================================
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_akun_kode ON akun(kode);
CREATE INDEX idx_akun_tipe_aktif ON akun(tipe, aktif);
CREATE INDEX idx_periode_tahun_bulan ON periode(tahun, bulan);
CREATE INDEX idx_pengajuan_pengaju_status ON pengajuan(pengaju_id, status);
CREATE INDEX idx_pengajuan_status ON pengajuan(status);
CREATE INDEX idx_jurnal_periode_status ON jurnal(periode_id, status);
CREATE INDEX idx_jurnal_tanggal ON jurnal(tanggal);
CREATE INDEX idx_jurnal_baris_jurnal_id ON jurnal_baris(jurnal_id);
CREATE INDEX idx_jurnal_baris_akun_id ON jurnal_baris(akun_id);
CREATE INDEX idx_audit_log_waktu ON audit_log(waktu DESC);

-- ==============================================================================
-- 4. FUNGSI HELPER KEAMANAN & AKSES PENGGUNA
-- ==============================================================================

-- 4.1 Mendapatkan Profil User Aktif
CREATE OR REPLACE FUNCTION get_current_user_profile()
RETURNS profiles AS $$
  SELECT * FROM profiles WHERE id = auth.uid() AND aktif = TRUE LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 4.2 Helper Pengecekan Peran
CREATE OR REPLACE FUNCTION is_direktur()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND peran = 'direktur' AND aktif = TRUE
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_akuntan()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND peran = 'akuntan' AND aktif = TRUE
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_finance_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND peran IN ('akuntan', 'direktur') AND aktif = TRUE
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ==============================================================================
-- 5. FUNGSI BISNIS ATOMIK DENGAN ROW-LEVEL LOCKING (FOR UPDATE)
-- ==============================================================================

-- 5.1 Generator Nomor Dokumen Berurutan Tanpa Celah (Gapless)
CREATE OR REPLACE FUNCTION generate_document_number(
  p_jenis TEXT,
  p_date DATE
)
RETURNS TEXT AS $$
DECLARE
  v_tahun INT;
  v_bulan INT;
  v_nomor INT;
  v_formatted_nomor TEXT;
BEGIN
  v_tahun := EXTRACT(YEAR FROM p_date);
  v_bulan := EXTRACT(MONTH FROM p_date);

  -- Kunci baris penomoran spesifik jenis, tahun, bulan dengan FOR UPDATE
  INSERT INTO penomoran (jenis, tahun, bulan, nomor_terakhir)
  VALUES (p_jenis, v_tahun, v_bulan, 1)
  ON CONFLICT (jenis, tahun, bulan)
  DO UPDATE SET nomor_terakhir = penomoran.nomor_terakhir + 1
  RETURNING nomor_terakhir INTO v_nomor;

  IF p_jenis = 'JU' THEN
    -- Format: JU-YYYYMM-NNNN (4 digit)
    v_formatted_nomor := 'JU-' || TO_CHAR(p_date, 'YYYYMM') || '-' || LPAD(v_nomor::TEXT, 4, '0');
  ELSIF p_jenis = 'PG' THEN
    -- Format: PG-YYYYMM-NNN (3 digit)
    v_formatted_nomor := 'PG-' || TO_CHAR(p_date, 'YYYYMM') || '-' || LPAD(v_nomor::TEXT, 3, '0');
  ELSE
    RAISE EXCEPTION 'Jenis penomoran tidak valid: %', p_jenis;
  END IF;

  RETURN v_formatted_nomor;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.2 Hitung Saldo Kas / Bank Saat Ini
CREATE OR REPLACE FUNCTION get_saldo_akun(p_akun_id BIGINT)
RETURNS BIGINT AS $$
DECLARE
  v_tipe tipe_akun;
  v_saldo BIGINT := 0;
BEGIN
  SELECT tipe INTO v_tipe FROM akun WHERE id = p_akun_id;

  SELECT COALESCE(
    CASE 
      WHEN v_tipe IN ('aset', 'beban') THEN SUM(jb.debit - jb.kredit)
      ELSE SUM(jb.kredit - jb.debit)
    END, 0
  )
  INTO v_saldo
  FROM jurnal_baris jb
  JOIN jurnal j ON j.id = jb.jurnal_id
  WHERE jb.akun_id = p_akun_id AND j.status = 'diposting';

  RETURN v_saldo;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 5.3 Eksekusi Pembayaran Pengajuan (BR-10 & Row-Level Locking Anti-Race Condition)
CREATE OR REPLACE FUNCTION execute_pembayaran_pengajuan(
  p_pengajuan_id BIGINT,
  p_akun_kas_id BIGINT,
  p_tanggal_bayar DATE
)
RETURNS JSONB AS $$
DECLARE
  v_pengajuan pengajuan%ROWTYPE;
  v_akun_kas akun%ROWTYPE;
  v_periode periode%ROWTYPE;
  v_saldo_sekarang BIGINT;
  v_nomor_jurnal TEXT;
  v_jurnal_id BIGINT;
  v_user_id UUID := auth.uid();
  v_user_role peran_pengguna;
BEGIN
  -- 1. Validasi otorisasi: Hanya Akuntan aktif yang dapat membayar
  SELECT peran INTO v_user_role FROM profiles WHERE id = v_user_id AND aktif = TRUE;
  IF v_user_role <> 'akuntan' THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Akuntan yang berwenang mengeksekusi pembayaran.';
  END IF;

  -- 2. Kunci baris pengajuan dengan FOR UPDATE untuk mencegah bentrok/pembayaran ganda
  SELECT * INTO v_pengajuan
  FROM pengajuan
  WHERE id = p_pengajuan_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pengajuan dengan ID % tidak ditemukan.', p_pengajuan_id;
  END IF;

  IF v_pengajuan.status <> 'disetujui' THEN
    RAISE EXCEPTION 'Pengajuan tidak dapat dibayar. Status saat ini: % (harus disetujui).', v_pengajuan.status;
  END IF;

  -- 3. Validasi akun kas/bank
  SELECT * INTO v_akun_kas
  FROM akun
  WHERE id = p_akun_kas_id AND aktif = TRUE AND is_kas_bank = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Akun kas/bank tidak valid atau tidak aktif.';
  END IF;

  -- 4. Validasi periode akuntansi pada tanggal bayar harus terbuka (BR-05)
  SELECT * INTO v_periode
  FROM periode
  WHERE tahun = EXTRACT(YEAR FROM p_tanggal_bayar)
    AND bulan = EXTRACT(MONTH FROM p_tanggal_bayar)
    AND status = 'terbuka';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Periode akuntansi untuk tanggal % belum dibuat atau sudah ditutup.', p_tanggal_bayar;
  END IF;

  -- 5. Validasi kecukupan saldo kas/bank (BR-10)
  v_saldo_sekarang := get_saldo_akun(p_akun_kas_id);
  IF v_saldo_sekarang < v_pengajuan.jumlah THEN
    RAISE EXCEPTION 'Saldo kas/bank tidak mencukupi (Saldo: %, Dibutuhkan: %).', v_saldo_sekarang, v_pengajuan.jumlah;
  END IF;

  -- 6. Generate nomor jurnal otomatis gapless
  v_nomor_jurnal := generate_document_number('JU', p_tanggal_bayar);

  -- 7. Buat dan posting jurnal secara otomatis
  INSERT INTO jurnal (
    nomor,
    tanggal,
    periode_id,
    keterangan,
    sumber,
    status,
    pengajuan_id,
    dibuat_oleh,
    diposting_oleh,
    diposting_pada
  ) VALUES (
    v_nomor_jurnal,
    p_tanggal_bayar,
    v_periode.id,
    'Pembayaran ' || v_pengajuan.nomor || ': ' || v_pengajuan.keterangan,
    'pengajuan',
    'diposting',
    v_pengajuan.id,
    v_user_id,
    v_user_id,
    NOW()
  )
  RETURNING id INTO v_jurnal_id;

  -- 8. Buat baris jurnal: Debit Akun Beban, Kredit Akun Kas/Bank
  INSERT INTO jurnal_baris (jurnal_id, urutan, akun_id, debit, kredit, keterangan)
  VALUES 
    (v_jurnal_id, 1, v_pengajuan.akun_beban_id, v_pengajuan.jumlah, 0, 'Beban: ' || v_pengajuan.keterangan),
    (v_jurnal_id, 2, p_akun_kas_id, 0, v_pengajuan.jumlah, 'Kas Keluar via ' || v_akun_kas.nama);

  -- 9. Perbarui status pengajuan menjadi 'dibayar'
  UPDATE pengajuan
  SET
    status = 'dibayar',
    akun_kas_id = p_akun_kas_id,
    dibayar_oleh = v_user_id,
    dibayar_pada = NOW()
  WHERE id = v_pengajuan.id;

  RETURN jsonb_build_object(
    'sukses', TRUE,
    'pengajuan_id', v_pengajuan.id,
    'nomor_pengajuan', v_pengajuan.nomor,
    'jurnal_id', v_jurnal_id,
    'nomor_jurnal', v_nomor_jurnal,
    'jumlah', v_pengajuan.jumlah
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 6. TRIGGER IMMUTABILITY & INTEGRITAS FINANSIAL
-- ==============================================================================

-- 6.1 Cegah Perubahan / Penghapusan Jurnal Diposting & Dibalik (BR-04)
CREATE OR REPLACE FUNCTION trg_protect_posted_journal()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('diposting', 'dibalik') THEN
      RAISE EXCEPTION 'Jurnal berstatus % tidak dapat dihapus. Koreksi harus lewat jurnal pembalik.', OLD.status;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IN ('diposting', 'dibalik') THEN
      -- Hanya izinkan perpindahan status dari 'diposting' ke 'dibalik' oleh sistem
      IF NOT (OLD.status = 'diposting' AND NEW.status = 'dibalik') THEN
        RAISE EXCEPTION 'Jurnal berstatus % bersifat permanen (immutable) dan tidak dapat diubah.', OLD.status;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_jurnal_immutability
BEFORE UPDATE OR DELETE ON jurnal
FOR EACH ROW EXECUTE FUNCTION trg_protect_posted_journal();

-- 6.2 Cegah Modifikasi Baris Jurnal yang Induknya Sudah Diposting
CREATE OR REPLACE FUNCTION trg_protect_journal_lines()
RETURNS TRIGGER AS $$
DECLARE
  v_status status_jurnal;
  v_jurnal_id BIGINT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_jurnal_id := OLD.jurnal_id;
  ELSE
    v_jurnal_id := NEW.jurnal_id;
  END IF;

  SELECT status INTO v_status FROM jurnal WHERE id = v_jurnal_id;

  IF v_status IN ('diposting', 'dibalik') THEN
    RAISE EXCEPTION 'Baris jurnal tidak dapat ditambah, diubah, atau dihapus karena jurnal induk berstatus %.', v_status;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_jurnal_baris_immutability
BEFORE INSERT OR UPDATE OR DELETE ON jurnal_baris
FOR EACH ROW EXECUTE FUNCTION trg_protect_journal_lines();

-- 6.3 Audit Log Trigger Otomatis untuk Aksi Sensitif (BR-12)
CREATE OR REPLACE FUNCTION trg_record_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_id_data TEXT;
  v_aksi TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_id_data := NEW.id::TEXT;
    v_aksi := TG_TABLE_NAME || ':INSERT';
    INSERT INTO audit_log (pelaku_id, aksi, nama_tabel, id_data, data_baru)
    VALUES (v_user_id, v_aksi, TG_TABLE_NAME, v_id_data, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_id_data := NEW.id::TEXT;
    v_aksi := TG_TABLE_NAME || ':UPDATE';
    INSERT INTO audit_log (pelaku_id, aksi, nama_tabel, id_data, data_lama, data_baru)
    VALUES (v_user_id, v_aksi, TG_TABLE_NAME, v_id_data, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_id_data := OLD.id::TEXT;
    v_aksi := TG_TABLE_NAME || ':DELETE';
    INSERT INTO audit_log (pelaku_id, aksi, nama_tabel, id_data, data_lama)
    VALUES (v_user_id, v_aksi, TG_TABLE_NAME, v_id_data, to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Pasang audit log trigger pada tabel-tabel sensitif
CREATE TRIGGER audit_profiles AFTER UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION trg_record_audit_log();
CREATE TRIGGER audit_pengajuan AFTER UPDATE ON pengajuan FOR EACH ROW EXECUTE FUNCTION trg_record_audit_log();
CREATE TRIGGER audit_jurnal AFTER UPDATE ON jurnal FOR EACH ROW EXECUTE FUNCTION trg_record_audit_log();
CREATE TRIGGER audit_periode AFTER UPDATE ON periode FOR EACH ROW EXECUTE FUNCTION trg_record_audit_log();
CREATE TRIGGER audit_akun AFTER INSERT OR UPDATE ON akun FOR EACH ROW EXECUTE FUNCTION trg_record_audit_log();

-- 6.4 Cegah Modifikasi Audit Log (BR-12: Tidak bisa diubah atau dihapus oleh siapapun)
CREATE OR REPLACE FUNCTION trg_protect_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Tabel audit_log bersifat immutable: tidak boleh diubah atau dihapus.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER protect_audit_log_immutable
BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW EXECUTE FUNCTION trg_protect_audit_log();

-- ==============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Aktifkan RLS pada seluruh 9 tabel
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE akun ENABLE ROW LEVEL SECURITY;
ALTER TABLE periode ENABLE ROW LEVEL SECURITY;
ALTER TABLE penomoran ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengajuan ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurnal ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurnal_baris ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE mutasi_bank ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 7.1 POLICIES UNTUK PROFILES
-- ------------------------------------------------------------------------------
-- Semua user terautentikasi dapat melihat daftar profiles (untuk relasi pengaju/peninjau)
CREATE POLICY "profiles_select_all_authenticated"
ON profiles FOR SELECT
TO authenticated
USING (TRUE);

-- Hanya Direktur yang bisa UPDATE peran dan status aktif pengguna (BR-12)
-- Direktur dilarang mengubah peran atau status aktif akunnya sendiri!
CREATE POLICY "profiles_update_direktur_only"
ON profiles FOR UPDATE
TO authenticated
USING (
  is_direktur() AND id <> auth.uid()
)
WITH CHECK (
  is_direktur() AND id <> auth.uid()
);

-- Pengguna boleh memperbarui nama_lengkap miliknya sendiri
CREATE POLICY "profiles_update_self_basic_info"
ON profiles FOR UPDATE
TO authenticated
USING (
  id = auth.uid()
)
WITH CHECK (
  id = auth.uid() AND
  peran = (SELECT peran FROM profiles WHERE id = auth.uid()) AND
  aktif = (SELECT aktif FROM profiles WHERE id = auth.uid())
);

-- ------------------------------------------------------------------------------
-- 7.2 POLICIES UNTUK AKUN
-- ------------------------------------------------------------------------------
-- Staf HANYA bisa SELECT akun tipe beban yang aktif (BR-11)
-- Akuntan & Direktur bisa SELECT seluruh akun
CREATE POLICY "akun_select_policy"
ON akun FOR SELECT
TO authenticated
USING (
  is_finance_user() OR (tipe = 'beban' AND aktif = TRUE)
);

-- Hanya Akuntan yang dapat INSERT/UPDATE akun (BR-01, BR-08)
CREATE POLICY "akun_manage_akuntan"
ON akun FOR ALL
TO authenticated
USING (is_akuntan())
WITH CHECK (is_akuntan());

-- ------------------------------------------------------------------------------
-- 7.3 POLICIES UNTUK PERIODE
-- ------------------------------------------------------------------------------
-- Hanya Akuntan dan Direktur yang dapat melihat periode
CREATE POLICY "periode_select_finance"
ON periode FOR SELECT
TO authenticated
USING (is_finance_user());

-- Akuntan dapat menambah periode atau menutup periode
CREATE POLICY "periode_manage_akuntan"
ON periode FOR INSERT
TO authenticated
WITH CHECK (is_akuntan());

CREATE POLICY "periode_update_finance"
ON periode FOR UPDATE
TO authenticated
USING (is_finance_user())
WITH CHECK (
  -- Akuntan hanya boleh menutup
  (is_akuntan() AND status = 'ditutup') OR
  -- Direktur hanya boleh membuka kembali
  (is_direktur() AND status = 'terbuka' AND char_length(COALESCE(alasan_buka_ulang, '')) >= 20)
);

-- ------------------------------------------------------------------------------
-- 7.4 POLICIES UNTUK PENGAJUAN
-- ------------------------------------------------------------------------------
-- SELECT: Staf hanya miliknya sendiri, Akuntan & Direktur melihat semua
CREATE POLICY "pengajuan_select"
ON pengajuan FOR SELECT
TO authenticated
USING (
  is_finance_user() OR pengaju_id = auth.uid()
);

-- INSERT: Semua peran aktif dapat membuat pengajuan, pengaju_id wajib auth.uid()
-- Direktur tidak membuat pengajuan (BR-09)
CREATE POLICY "pengajuan_insert"
ON pengajuan FOR INSERT
TO authenticated
WITH CHECK (
  pengaju_id = auth.uid() AND NOT is_direktur()
);

-- UPDATE: 
-- 1. Pengaju hanya bisa edit miliknya sendiri saat status draf atau perlu_revisi
CREATE POLICY "pengajuan_update_pengaju"
ON pengajuan FOR UPDATE
TO authenticated
USING (
  pengaju_id = auth.uid() AND status IN ('draf', 'perlu_revisi')
)
WITH CHECK (
  pengaju_id = auth.uid() AND status IN ('draf', 'diajukan', 'dibatalkan', 'menunggu_direktur')
);

-- 2. Akuntan bisa update pengajuan (verifikasi/revisi/tolak/bayar) asal BUKAN miliknya sendiri (BR-09)
CREATE POLICY "pengajuan_update_akuntan"
ON pengajuan FOR UPDATE
TO authenticated
USING (
  is_akuntan() AND pengaju_id <> auth.uid()
)
WITH CHECK (
  is_akuntan() AND pengaju_id <> auth.uid()
);

-- 3. Direktur bisa approve/reject pengajuan bernilai > 1M atau milik Akuntan
CREATE POLICY "pengajuan_update_direktur"
ON pengajuan FOR UPDATE
TO authenticated
USING (
  is_direktur() AND status = 'menunggu_direktur'
)
WITH CHECK (
  is_direktur()
);

-- ------------------------------------------------------------------------------
-- 7.5 POLICIES UNTUK JURNAL & JURNAL_BARIS
-- ------------------------------------------------------------------------------
-- SELECT: Hanya Akuntan dan Direktur (Staf DILARANG melihat) (BR-11)
CREATE POLICY "jurnal_select_finance"
ON jurnal FOR SELECT
TO authenticated
USING (is_finance_user());

CREATE POLICY "jurnal_baris_select_finance"
ON jurnal_baris FOR SELECT
TO authenticated
USING (is_finance_user());

-- INSERT/UPDATE/DELETE: Hanya Akuntan
CREATE POLICY "jurnal_manage_akuntan"
ON jurnal FOR ALL
TO authenticated
USING (is_akuntan())
WITH CHECK (is_akuntan());

CREATE POLICY "jurnal_baris_manage_akuntan"
ON jurnal_baris FOR ALL
TO authenticated
USING (is_akuntan())
WITH CHECK (is_akuntan());

-- ------------------------------------------------------------------------------
-- 7.6 POLICIES UNTUK AUDIT_LOG
-- ------------------------------------------------------------------------------
-- SELECT: Hanya Direktur yang berhak melihat audit log (BR-12)
CREATE POLICY "audit_log_select_direktur_only"
ON audit_log FOR SELECT
TO authenticated
USING (is_direktur());

-- Direct insert/update/delete dilarang untuk semua role (hanya via trigger SECURITY DEFINER)
-- (Tidak ada policy INSERT/UPDATE/DELETE publik)

-- ------------------------------------------------------------------------------
-- 7.7 POLICIES UNTUK MUTASI_BANK
-- ------------------------------------------------------------------------------
CREATE POLICY "mutasi_bank_select_finance"
ON mutasi_bank FOR SELECT
TO authenticated
USING (is_finance_user());

CREATE POLICY "mutasi_bank_manage_akuntan"
ON mutasi_bank FOR ALL
TO authenticated
USING (is_akuntan())
WITH CHECK (is_akuntan());

-- ------------------------------------------------------------------------------
-- 7.8 POLICIES UNTUK PENOMORAN
-- ------------------------------------------------------------------------------
-- Akses langsung ditutup; modifikasi hanya melalui fungsi generate_document_number
CREATE POLICY "penomoran_select_finance"
ON penomoran FOR SELECT
TO authenticated
USING (is_finance_user());

-- ==============================================================================
-- 8. STORAGE BUCKET DAN KEBIJAKAN AKSES PRIVAT (BUKTI NOTA)
-- ==============================================================================
-- Buat bucket privat jika belum ada
INSERT INTO storage.buckets (id, name, public)
VALUES ('bukti-pengajuan', 'bukti-pengajuan', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Kebijakan Akses Storage:
-- 1. Staf boleh upload bukti miliknya sendiri ke folder id-nya (pengaju_id/filename)
CREATE POLICY "storage_insert_own_receipt"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'bukti-pengajuan' AND
  (storage.foldername(name))[1] = auth.uid()::TEXT
);

-- 2. Staf hanya boleh membaca bukti miliknya sendiri; Akuntan & Direktur boleh membaca semua
CREATE POLICY "storage_select_receipt"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'bukti-pengajuan' AND (
    is_finance_user() OR (storage.foldername(name))[1] = auth.uid()::TEXT
  )
);
