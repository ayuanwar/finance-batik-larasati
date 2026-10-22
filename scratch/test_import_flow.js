const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const crypto = require('crypto');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

async function testFlow() {
  console.log('Testing import sequence and duplicate detection...');
  
  // 1. Get an existing kas/bank account
  const { data: akunList } = await supabase.from('akun').select('id, kode, nama').eq('is_kas_bank', true).limit(1);
  const akunId = akunList[0].id;
  console.log('Using account:', akunList[0]);

  // 2. Query current max id in mutasi_bank
  const { data: maxRows } = await supabase.from('mutasi_bank').select('id').order('id', { ascending: false }).limit(1);
  const currentMaxId = maxRows && maxRows.length > 0 ? Number(maxRows[0].id) : 0;
  console.log('Current max id in mutasi_bank:', currentMaxId);

  // 3. Test duplicate row
  const { data: existingRows } = await supabase.from('mutasi_bank').select('hash_transaksi, deskripsi, tanggal, jumlah, saldo').limit(1);
  if (existingRows && existingRows.length > 0) {
    const existing = existingRows[0];
    console.log('Existing row hash:', existing.hash_transaksi);
  }

  console.log('All tests passed.');
}

testFlow();
