-- ==============================================================================
-- SINKRONISASI SEQUENCE IDENTITY SETELAH SEEDING
-- Menyelaraskan sequence internal PostgreSQL agar ID baru yang di-generate
-- otomatis di masa depan tidak bentrok dengan ID data yang sudah diimpor.
-- ==============================================================================

SELECT setval(pg_get_serial_sequence('akun', 'id'), COALESCE((SELECT MAX(id) FROM akun), 1));
SELECT setval(pg_get_serial_sequence('periode', 'id'), COALESCE((SELECT MAX(id) FROM periode), 1));
SELECT setval(pg_get_serial_sequence('pengajuan', 'id'), COALESCE((SELECT MAX(id) FROM pengajuan), 1));
SELECT setval(pg_get_serial_sequence('jurnal', 'id'), COALESCE((SELECT MAX(id) FROM jurnal), 1));
SELECT setval(pg_get_serial_sequence('jurnal_baris', 'id'), COALESCE((SELECT MAX(id) FROM jurnal_baris), 1));
SELECT setval(pg_get_serial_sequence('audit_log', 'id'), COALESCE((SELECT MAX(id) FROM audit_log), 1));
SELECT setval(pg_get_serial_sequence('mutasi_bank', 'id'), COALESCE((SELECT MAX(id) FROM mutasi_bank), 1));
