import { getSupabaseClient, getSupabaseConfig, testSupabaseConnection } from './supabase';
import { hitungSimulasiPinjaman, hitungJadwalAkumulasiPinjaman } from './formatters';

const STORAGE_KEY = 'koperasi_idaman_db_v1';

// Clean initial data without dummy demo records
const initialData = {
  settings: {
    namaKoperasi: 'Koperasi Idaman',
    alamat: 'Jl. Situtarate - Cibaduyut',
    telepon: '085323066335',
    ketua: 'Asep Solehudin, S.Pd.',
    sekretaris: '',
    bendahara: '',
    pengawas: '',
    simpananPokok: 500000,
    simpananWajib: 100000,
    sukuBungaPinjaman: 1.5,
    shuPersenAnggota: 40,
    shuPersenModal: 30,
    shuPersenPengurus: 20,
    shuPersenCadangan: 10
  },
  anggota: [],
  simpanan: [],
  pinjaman: [],
  kas: [],
  sembako_produk: [],
  sembako_transaksi: [],
  qurban_peserta: [],
  qurban_mutasi: [],
  tagihan_override: {}
};

function getDB() {
  if (typeof window === 'undefined') {
    return initialData;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
      return initialData;
    }
    const parsed = JSON.parse(raw);
    return {
      settings: { ...initialData.settings, ...(parsed.settings || {}) },
      anggota: Array.isArray(parsed.anggota) ? parsed.anggota.filter(Boolean) : [],
      simpanan: Array.isArray(parsed.simpanan) ? parsed.simpanan.filter(Boolean) : [],
      pinjaman: Array.isArray(parsed.pinjaman) ? parsed.pinjaman.filter(Boolean) : [],
      kas: Array.isArray(parsed.kas) ? parsed.kas.filter(Boolean) : [],
      sembako_produk: Array.isArray(parsed.sembako_produk) ? parsed.sembako_produk.filter(Boolean) : [],
      sembako_transaksi: Array.isArray(parsed.sembako_transaksi) ? parsed.sembako_transaksi.filter(Boolean) : [],
      qurban_peserta: Array.isArray(parsed.qurban_peserta) ? parsed.qurban_peserta.filter(Boolean) : [],
      qurban_mutasi: Array.isArray(parsed.qurban_mutasi) ? parsed.qurban_mutasi.filter(Boolean) : [],
      tagihan_override: parsed.tagihan_override || {}
    };
  } catch (e) {
    console.error('Error reading localStorage DB:', e);
    return initialData;
  }
}

function saveDB(data) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new Event('koperasi_db_updated'));
  } catch (e) {
    console.error('Error writing localStorage DB:', e);
  }
}

export const dataService = {
  // --- SUPABASE SYNC & CLOUD CONNECTION ---
  async fetchFromSupabase() {
    const client = getSupabaseClient();
    if (!client) return { success: false, message: 'Supabase client tidak aktif.' };

    try {
      const safeQuery = async (queryPromise) => {
        try {
          const res = await queryPromise;
          if (res?.error) {
            console.warn('Supabase query error:', res.error.message);
            return null; // Return null on error to avoid wiping existing local data!
          }
          return res?.data || [];
        } catch (e) {
          console.warn('Supabase query exception:', e);
          return null;
        }
      };

      const [
        anggotaData,
        simpananData,
        pinjamanData,
        angsuranData,
        kasData,
        settingsData,
        sembakoProdukData,
        sembakoTrxData,
        qurbanPesertaData,
        qurbanMutasiData,
        tagihanOverrideData
      ] = await Promise.all([
        safeQuery(client.from('anggota').select('*')),
        safeQuery(client.from('simpanan').select('*')),
        safeQuery(client.from('pinjaman').select('*')),
        safeQuery(client.from('riwayat_angsuran').select('*')),
        safeQuery(client.from('kas').select('*')),
        safeQuery(client.from('settings').select('*').limit(1)),
        safeQuery(client.from('sembako_produk').select('*')),
        safeQuery(client.from('sembako_transaksi').select('*')),
        safeQuery(client.from('qurban_peserta').select('*')),
        safeQuery(client.from('qurban_mutasi').select('*')),
        safeQuery(client.from('tagihan_override').select('*'))
      ]);

      const db = getDB();

      // Only update local store if query succeeded (not null)
      if (anggotaData !== null) {
        db.anggota = anggotaData.map((a) => ({
          id: a.nomor_anggota || a.id,
          nomor_anggota: a.nomor_anggota || a.id,
          nama: a.nama_lengkap,
          nama_lengkap: a.nama_lengkap,
          alamat: a.alamat_lengkap,
          alamat_lengkap: a.alamat_lengkap,
          nomor_hp: a.nomor_hp,
          pekerjaan: a.pekerjaan || '-',
          tempat_lahir: a.tempat_lahir || '-',
          tanggal_lahir: a.tanggal_lahir || '',
          tanggal_daftar: a.tanggal_daftar || '',
          status: a.status_keanggotaan || 'Aktif',
          status_keanggotaan: a.status_keanggotaan || 'Aktif'
        }));
      }

      if (simpananData !== null) {
        db.simpanan = simpananData.map((s) => ({
          id: s.kode_transaksi || s.id,
          nomor_anggota: s.nomor_anggota,
          nama_anggota: s.nama_anggota,
          tanggal: s.tanggal,
          jenis: s.jenis_simpanan,
          tipe: s.tipe || 'Setoran',
          jumlah: Number(s.jumlah),
          metode: s.metode || 'Tunai',
          pencatat: s.pencatat || 'Admin',
          keterangan: s.keterangan || '-'
        }));
      }

      if (pinjamanData !== null) {
        db.pinjaman = pinjamanData.map((p) => {
          const pinjAngsuran = (angsuranData || []).filter(
            (a) => a.nomor_pinjaman === (p.nomor_pinjaman || p.id)
          ).map((a) => ({
            id: a.id,
            tanggal: a.tanggal || a.tanggal_bayar,
            angsuran_ke: a.angsuran_ke,
            pokok: Number(a.pokok || a.jumlah || 0),
            bunga: Number(a.bunga || 0),
            total_bayar: Number(a.total_bayar || a.jumlah || 0),
            jumlah: Number(a.jumlah || 0),
            metode: a.metode || 'Tunai',
            penerima: a.penerima || 'Admin Kasir',
            sisa_hutang: Number(a.sisa_hutang || 0)
          }));

          return {
            id: p.nomor_pinjaman || p.id,
            nomor_pinjaman: p.nomor_pinjaman || p.id,
            nomor_anggota: p.nomor_anggota,
            nama: p.nama,
            tanggal: p.tanggal_pengajuan,
            jumlah: Number(p.jumlah),
            bunga: Number(p.bunga),
            tenor: Number(p.tenor),
            angsuran_pokok: Number(p.angsuran_pokok),
            angsuran_bunga: Number(p.angsuran_bunga),
            total_angsuran_bulanan: Number(p.total_angsuran_bulanan),
            total_pinjaman: Number(p.total_pinjaman),
            total_terbayar: Number(p.total_terbayar || 0),
            sisa_hutang: Number(p.sisa_hutang),
            status: p.status,
            keperluan: p.keperluan || '-',
            riwayat_angsuran: pinjAngsuran
          };
        });
      }

      if (kasData !== null) {
        db.kas = kasData.map((k) => ({
          id: k.kode_transaksi || k.id,
          tanggal: k.tanggal,
          jenis: k.jenis,
          kategori: k.kategori,
          jumlah: Number(k.jumlah),
          keterangan: k.keterangan || '-',
          ref_id: k.ref_id || ''
        }));
      }

      if (sembakoProdukData !== null) {
        db.sembako_produk = sembakoProdukData.map((pr) => ({
          id: pr.kode_produk || pr.id,
          kode_produk: pr.kode_produk || pr.id,
          nama: pr.nama || pr.nama_produk,
          kategori: pr.kategori,
          satuan: pr.satuan,
          harga_beli: Number(pr.harga_beli),
          harga_jual: Number(pr.harga_jual),
          stok: Number(pr.stok)
        }));
      }

      if (sembakoTrxData !== null) {
        db.sembako_transaksi = sembakoTrxData.map((st) => ({
          id: st.kode_transaksi || st.id,
          tanggal: st.tanggal,
          nomor_anggota: st.nomor_anggota || '-',
          pembeli: st.pembeli || st.nama_pembeli,
          nama_pembeli: st.pembeli || st.nama_pembeli,
          items: typeof st.items === 'string' ? JSON.parse(st.items) : st.items,
          total: Number(st.total || st.total_belanja || 0),
          total_belanja: Number(st.total || st.total_belanja || 0),
          bayar: Number(st.bayar || 0),
          kembali: Number(st.kembali || 0),
          metode: st.metode || st.metode_bayar || 'Tunai',
          metode_bayar: st.metode || st.metode_bayar || 'Tunai'
        }));
      }

      if (qurbanPesertaData !== null) {
        db.qurban_peserta = qurbanPesertaData.map((qp) => ({
          id: qp.kode_peserta || qp.id,
          kode_peserta: qp.kode_peserta || qp.id,
          nomor_anggota: qp.nomor_anggota || '-',
          nama: qp.nama,
          target_hewan: qp.tipe_hewan || qp.target_hewan,
          tipe_hewan: qp.tipe_hewan || qp.target_hewan,
          target_nominal: Number(qp.target_nominal),
          total_terkumpul: Number(qp.total_terkumpul || 0),
          sisa_target: Number(qp.sisa_target ?? (Number(qp.target_nominal) - Number(qp.total_terkumpul || 0))),
          tahun_target: qp.tahun_qurban || qp.tahun_target,
          tahun_qurban: qp.tahun_qurban || qp.tahun_target,
          status: qp.status || 'Berjalan',
          tanggal_daftar: qp.tanggal_daftar || ''
        }));
      }

      if (qurbanMutasiData !== null) {
        db.qurban_mutasi = qurbanMutasiData.map((qm) => ({
          id: qm.kode_mutasi || qm.id,
          kode_mutasi: qm.kode_mutasi || qm.id,
          peserta_id: qm.peserta_id,
          nomor_anggota: qm.nomor_anggota || '-',
          nama: qm.nama_peserta || qm.nama,
          nama_peserta: qm.nama_peserta || qm.nama,
          tanggal: qm.tanggal,
          tipe: qm.tipe || qm.jenis || 'Setoran',
          jenis: qm.tipe || qm.jenis || 'Setoran',
          jumlah: Number(qm.jumlah),
          metode: qm.metode || 'Tunai',
          keterangan: qm.keterangan || '-'
        }));
      }

      if (tagihanOverrideData !== null && tagihanOverrideData.length > 0) {
        const overrides = {};
        tagihanOverrideData.forEach((to) => {
          const key = `${to.periode}_${to.nomor_anggota}`;
          overrides[key] = {
            wajib: Number(to.wajib || 0),
            sukarela: Number(to.sukarela || 0),
            qurban: Number(to.qurban || 0),
            pokok: Number(to.pokok || 0),
            jasa: Number(to.jasa || 0),
            sembako: Number(to.sembako || 0),
            cicilanKe: Number(to.cicilan_ke || 0)
          };
        });
        db.tagihan_override = overrides;
      }

      if (settingsData !== null && settingsData.length > 0) {
        const s = settingsData[0];
        db.settings = {
          namaKoperasi: s.nama_koperasi,
          badanHukum: s.badan_hukum,
          alamat: s.alamat,
          telepon: s.telepon,
          email: s.email,
          ketua: s.ketua,
          sekretaris: s.sekretaris || '',
          bendahara: s.bendahara,
          pengawas: s.pengawas || '',
          simpananPokok: Number(s.simpanan_pokok),
          simpananWajib: Number(s.simpanan_wajib),
          sukuBungaPinjaman: Number(s.suku_bunga_pinjaman),
          shuPersenAnggota: Number(s.shu_persen_anggota),
          shuPersenModal: Number(s.shu_persen_modal),
          shuPersenPengurus: Number(s.shu_persen_pengurus),
          shuPersenCadangan: Number(s.shu_persen_cadangan)
        };
      }

      saveDB(db);
      return { success: true, message: 'Seluruh data berhasil disinkronkan dari Supabase Cloud.' };
    } catch (err) {
      console.error('Error fetching Supabase data:', err);
      return { success: false, message: err.message || 'Gagal memuat data dari Supabase.' };
    }
  },

  async pushAllToSupabase() {
    const client = getSupabaseClient();
    if (!client) return { success: false, message: 'Supabase client tidak aktif.' };

    const db = getDB();

    try {
      // 1. Anggota
      for (const a of db.anggota) {
        await client.from('anggota').upsert({
          nomor_anggota: a.nomor_anggota || a.id,
          nama_lengkap: a.nama_lengkap || a.nama,
          alamat_lengkap: a.alamat_lengkap || a.alamat,
          nomor_hp: a.nomor_hp,
          pekerjaan: a.pekerjaan || '-',
          tempat_lahir: a.tempat_lahir || '-',
          tanggal_lahir: a.tanggal_lahir || null,
          tanggal_daftar: a.tanggal_daftar || null,
          status_keanggotaan: a.status_keanggotaan || a.status || 'Aktif'
        }, { onConflict: 'nomor_anggota' });
      }

      // 2. Simpanan
      for (const s of db.simpanan) {
        await client.from('simpanan').upsert({
          kode_transaksi: s.id,
          nomor_anggota: s.nomor_anggota,
          nama_anggota: s.nama_anggota,
          tanggal: s.tanggal,
          jenis_simpanan: s.jenis,
          tipe: s.tipe || 'Setoran',
          jumlah: Number(s.jumlah),
          metode: s.metode || 'Tunai',
          pencatat: s.pencatat || 'Admin',
          keterangan: s.keterangan || '-'
        }, { onConflict: 'kode_transaksi' });
      }

      // 3. Pinjaman & Riwayat Angsuran
      for (const p of db.pinjaman) {
        const noPinj = p.nomor_pinjaman || p.id;
        await client.from('pinjaman').upsert({
          nomor_pinjaman: noPinj,
          nomor_anggota: p.nomor_anggota,
          nama: p.nama,
          tanggal_pengajuan: p.tanggal,
          jumlah: Number(p.jumlah),
          bunga: Number(p.bunga),
          tenor: Number(p.tenor),
          angsuran_pokok: Number(p.angsuran_pokok),
          angsuran_bunga: Number(p.angsuran_bunga),
          total_angsuran_bulanan: Number(p.total_angsuran_bulanan),
          total_pinjaman: Number(p.total_pinjaman),
          total_terbayar: Number(p.total_terbayar || 0),
          sisa_hutang: Number(p.sisa_hutang),
          status: p.status,
          keperluan: p.keperluan || '-'
        }, { onConflict: 'nomor_pinjaman' });

        if (Array.isArray(p.riwayat_angsuran)) {
          for (const ang of p.riwayat_angsuran) {
            await client.from('riwayat_angsuran').upsert({
              nomor_pinjaman: noPinj,
              angsuran_ke: ang.angsuran_ke,
              tanggal: ang.tanggal || new Date().toISOString().split('T')[0],
              jumlah: Number(ang.jumlah || ang.total_bayar || 0),
              metode: ang.metode || 'Tunai',
              penerima: ang.penerima || 'Admin Kasir'
            });
          }
        }
      }

      // 4. Kas Harian
      for (const k of db.kas) {
        await client.from('kas').upsert({
          kode_transaksi: k.id,
          tanggal: k.tanggal,
          jenis: k.jenis,
          kategori: k.kategori,
          jumlah: Number(k.jumlah),
          keterangan: k.keterangan || '-',
          ref_id: k.ref_id || null
        }, { onConflict: 'kode_transaksi' });
      }

      // 5. Produk Sembako
      for (const pr of (db.sembako_produk || [])) {
        await client.from('sembako_produk').upsert({
          kode_produk: pr.kode_produk || pr.id,
          nama: pr.nama || pr.nama_produk,
          kategori: pr.kategori || 'Umum',
          satuan: pr.satuan || 'Pcs',
          harga_beli: Number(pr.harga_beli),
          harga_jual: Number(pr.harga_jual),
          stok: Number(pr.stok)
        }, { onConflict: 'kode_produk' });
      }

      // 6. Transaksi Sembako
      for (const st of (db.sembako_transaksi || [])) {
        await client.from('sembako_transaksi').upsert({
          kode_transaksi: st.id || st.kode_transaksi,
          tanggal: st.tanggal,
          pembeli: st.pembeli || st.nama_pembeli || 'Pelanggan Umum',
          nomor_anggota: st.nomor_anggota || '-',
          items: st.items || [],
          total: Number(st.total || st.total_belanja || 0),
          bayar: Number(st.bayar || 0),
          kembali: Number(st.kembali || 0),
          metode: st.metode || 'Tunai'
        }, { onConflict: 'kode_transaksi' });
      }

      // 7. Peserta Tabungan Qurban
      for (const qp of (db.qurban_peserta || [])) {
        const targetNominal = Number(qp.target_nominal) || 3500000;
        const totalKumpul = Number(qp.total_terkumpul || 0);
        await client.from('qurban_peserta').upsert({
          kode_peserta: qp.id || qp.kode_peserta,
          nomor_anggota: qp.nomor_anggota || '-',
          nama: qp.nama,
          tipe_hewan: qp.tipe_hewan || qp.target_hewan || '1 Ekor Kambing / Domba',
          target_nominal: targetNominal,
          total_terkumpul: totalKumpul,
          sisa_target: Math.max(0, targetNominal - totalKumpul),
          tahun_qurban: qp.tahun_qurban || qp.tahun_target || '1448 H / 2026',
          status: qp.status || 'Berjalan',
          tanggal_daftar: qp.tanggal_daftar || new Date().toISOString().split('T')[0]
        }, { onConflict: 'kode_peserta' });
      }

      // 8. Mutasi Tabungan Qurban
      for (const qm of (db.qurban_mutasi || [])) {
        await client.from('qurban_mutasi').upsert({
          kode_mutasi: qm.id || qm.kode_mutasi,
          peserta_id: qm.peserta_id,
          nomor_anggota: qm.nomor_anggota || '-',
          nama_peserta: qm.nama_peserta || qm.nama,
          tanggal: qm.tanggal,
          tipe: qm.tipe || qm.jenis || 'Setoran',
          jumlah: Number(qm.jumlah),
          metode: qm.metode || 'Tunai',
          keterangan: qm.keterangan || '-'
        }, { onConflict: 'kode_mutasi' });
      }

      // 9. Tagihan Override Bulanan
      if (db.tagihan_override && typeof db.tagihan_override === 'object') {
        for (const [key, val] of Object.entries(db.tagihan_override)) {
          // format key can be YYYY-MM_NOANGGOTA or nested by month [month][noAnggota]
          if (val && typeof val === 'object') {
            if (val.wajib !== undefined || val.sukarela !== undefined || val.pokok !== undefined) {
              const parts = key.split('_');
              const periode = parts[0];
              const nomor_anggota = parts.slice(1).join('_');
              if (periode && nomor_anggota) {
                await client.from('tagihan_override').upsert({
                  periode,
                  nomor_anggota,
                  wajib: val.wajib !== undefined ? Number(val.wajib) : null,
                  sukarela: val.sukarela !== undefined ? Number(val.sukarela) : null,
                  qurban: val.qurban !== undefined ? Number(val.qurban) : null,
                  cicilan_ke: val.cicilanKe ? Number(val.cicilanKe) : null,
                  pokok: val.pokok !== undefined ? Number(val.pokok) : null,
                  jasa: val.jasa !== undefined ? Number(val.jasa) : null,
                  sembako: val.sembako !== undefined ? Number(val.sembako) : null
                }, { onConflict: 'periode,nomor_anggota' });
              }
            } else {
              // Nested structure: month -> noAnggota -> values
              const periode = key;
              for (const [noAnggota, itemVal] of Object.entries(val)) {
                if (itemVal && typeof itemVal === 'object') {
                  await client.from('tagihan_override').upsert({
                    periode,
                    nomor_anggota: noAnggota,
                    wajib: itemVal.wajib !== undefined ? Number(itemVal.wajib) : null,
                    sukarela: itemVal.sukarela !== undefined ? Number(itemVal.sukarela) : null,
                    qurban: itemVal.qurban !== undefined ? Number(itemVal.qurban) : null,
                    cicilan_ke: itemVal.cicilanKe ? Number(itemVal.cicilanKe) : null,
                    pokok: itemVal.pokok !== undefined ? Number(itemVal.pokok) : null,
                    jasa: itemVal.jasa !== undefined ? Number(itemVal.jasa) : null,
                    sembako: itemVal.sembako !== undefined ? Number(itemVal.sembako) : null
                  }, { onConflict: 'periode,nomor_anggota' });
                }
              }
            }
          }
        }
      }

      // 10. Pengaturan Koperasi
      if (db.settings) {
        const settingsPayload = {
          nama_koperasi: db.settings.namaKoperasi,
          badan_hukum: db.settings.badanHukum,
          alamat: db.settings.alamat,
          telepon: db.settings.telepon,
          email: db.settings.email,
          ketua: db.settings.ketua,
          sekretaris: db.settings.sekretaris,
          bendahara: db.settings.bendahara,
          pengawas: db.settings.pengawas,
          simpanan_pokok: Number(db.settings.simpananPokok),
          simpanan_wajib: Number(db.settings.simpananWajib),
          suku_bunga_pinjaman: Number(db.settings.sukuBungaPinjaman),
          shu_persen_anggota: Number(db.settings.shuPersenAnggota),
          shu_persen_modal: Number(db.settings.shuPersenModal),
          shu_persen_pengurus: Number(db.settings.shuPersenPengurus),
          shu_persen_cadangan: Number(db.settings.shuPersenCadangan)
        };

        const { data: existingRows } = await client.from('settings').select('id').limit(1);
        if (existingRows && existingRows.length > 0) {
          await client.from('settings').update(settingsPayload).eq('id', existingRows[0].id);
        } else {
          await client.from('settings').insert([settingsPayload]);
        }
      }

      return { success: true, message: 'Seluruh data berhasil disinkronkan ke Supabase Cloud!' };
    } catch (err) {
      console.error('Error pushing data to Supabase:', err);
      return { success: false, message: err.message || 'Gagal mengunggah data ke Supabase.' };
    }
  },

  async clearSupabaseData() {
    const client = getSupabaseClient();
    if (!client) return { success: false, message: 'Supabase client tidak aktif.' };

    try {
      await client.from('tagihan_override').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await client.from('qurban_mutasi').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await client.from('qurban_peserta').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await client.from('sembako_transaksi').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await client.from('sembako_produk').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await client.from('riwayat_angsuran').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await client.from('pinjaman').delete().neq('nomor_pinjaman', 'DUMMY');
      await client.from('simpanan').delete().neq('kode_transaksi', 'DUMMY');
      await client.from('kas').delete().neq('kode_transaksi', 'DUMMY');
      await client.from('anggota').delete().neq('nomor_anggota', 'DUMMY');
      return { success: true, message: 'Data di Supabase Cloud berhasil dikosongkan.' };
    } catch (err) {
      console.error('Error clearing Supabase tables:', err);
      return { success: false, message: err.message || 'Gagal mengosongkan tabel Supabase.' };
    }
  },

  // --- ANGGOTA ---
  getAnggotaList() {
    const db = getDB();
    return db.anggota || [];
  },

  getAnggotaById(id) {
    const db = getDB();
    return (db.anggota || []).find((a) => a.id === id || a.nomor_anggota === id);
  },

  getNextNomorAnggota() {
    const db = getDB();
    const list = db.anggota || [];
    let maxNum = 0;
    list.forEach((a) => {
      const no = a.nomor_anggota || a.id || '';
      const match = no.match(/^KI-(\d+)$/i);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    });
    const nextNum = maxNum > 0 ? maxNum + 1 : (list.length + 1);
    return `KI-${String(nextNum).padStart(2, '0')}`;
  },

  addAnggota(anggotaData, autoSimpananPokok = true) {
    const db = getDB();
    const today = new Date().toISOString().split('T')[0];
    const id = anggotaData.nomor_anggota || this.getNextNomorAnggota();

    const newAnggota = {
      id,
      nomor_anggota: id,
      nama: anggotaData.nama || anggotaData.nama_lengkap || '',
      nama_lengkap: anggotaData.nama_lengkap || anggotaData.nama || '',
      alamat: anggotaData.alamat || anggotaData.alamat_lengkap || '',
      alamat_lengkap: anggotaData.alamat_lengkap || anggotaData.alamat || '',
      nomor_hp: anggotaData.nomor_hp || '',
      pekerjaan: anggotaData.pekerjaan || '-',
      tempat_lahir: anggotaData.tempat_lahir || '-',
      tanggal_lahir: anggotaData.tanggal_lahir || '',
      tanggal_daftar: anggotaData.tanggal_daftar || today,
      status: anggotaData.status || anggotaData.status_keanggotaan || 'Aktif',
      status_keanggotaan: anggotaData.status_keanggotaan || anggotaData.status || 'Aktif'
    };

    db.anggota.unshift(newAnggota);

    if (autoSimpananPokok) {
      const nominalPokok = db.settings.simpananPokok || 500000;
      const simpananId = `SMP-${Date.now().toString().slice(-4)}`;
      const newSimpanan = {
        id: simpananId,
        nomor_anggota: id,
        nama_anggota: newAnggota.nama,
        tanggal: today,
        jenis: 'Pokok',
        jumlah: nominalPokok,
        metode: 'Tunai',
        pencatat: 'Admin Sistem',
        keterangan: 'Simpanan Pokok saat pendaftaran anggota baru'
      };
      db.simpanan.unshift(newSimpanan);

      db.kas.unshift({
        id: `KAS-${Date.now().toString().slice(-4)}`,
        tanggal: today,
        jenis: 'Penerimaan',
        kategori: 'Simpanan Pokok',
        jumlah: nominalPokok,
        keterangan: `Simpanan Pokok pendaftaran ${newAnggota.nama} (${id})`,
        ref_id: simpananId
      });
    }

    saveDB(db);

    try {
      const client = getSupabaseClient();
      if (client) {
        // Insert anggota ke Supabase
        client.from('anggota').upsert([{
          nomor_anggota: newAnggota.nomor_anggota,
          nama_lengkap: newAnggota.nama_lengkap,
          alamat_lengkap: newAnggota.alamat_lengkap,
          nomor_hp: newAnggota.nomor_hp,
          pekerjaan: newAnggota.pekerjaan,
          tempat_lahir: newAnggota.tempat_lahir,
          tanggal_lahir: newAnggota.tanggal_lahir || null,
          tanggal_daftar: newAnggota.tanggal_daftar || today,
          status_keanggotaan: newAnggota.status_keanggotaan
        }], { onConflict: 'nomor_anggota' }).then(async ({ error: errAnggota }) => {
          if (errAnggota) {
            console.warn('Supabase anggota insert note:', errAnggota.message);
          } else if (autoSimpananPokok) {
            const nominalPokok = db.settings.simpananPokok || 500000;
            const simpananId = `SMP-${Date.now().toString().slice(-4)}`;
            
            // Insert Simpanan Pokok ke Supabase
            await client.from('simpanan').insert([{
              kode_transaksi: simpananId,
              nomor_anggota: newAnggota.nomor_anggota,
              nama_anggota: newAnggota.nama_lengkap,
              tanggal: today,
              jenis_simpanan: 'Pokok',
              tipe: 'Setoran',
              jumlah: nominalPokok,
              metode: 'Tunai',
              pencatat: 'Admin Sistem',
              keterangan: 'Simpanan Pokok saat pendaftaran anggota baru'
            }]);

            // Insert Kas ke Supabase
            await client.from('kas').insert([{
              kode_transaksi: `KAS-${Date.now().toString().slice(-4)}`,
              tanggal: today,
              jenis: 'Penerimaan',
              kategori: 'Simpanan Pokok',
              jumlah: nominalPokok,
              keterangan: `Simpanan Pokok pendaftaran ${newAnggota.nama_lengkap} (${newAnggota.nomor_anggota})`,
              ref_id: simpananId
            }]);
          }
        });
      }
    } catch (_) {}

    return newAnggota;
  },

  async updateAnggota(id, updatedFields) {
    const db = getDB();
    const index = db.anggota.findIndex((a) => a.id === id || a.nomor_anggota === id);
    if (index !== -1) {
      db.anggota[index] = {
        ...db.anggota[index],
        ...updatedFields,
        nama: updatedFields.nama || updatedFields.nama_lengkap || db.anggota[index].nama,
        nama_lengkap: updatedFields.nama_lengkap || updatedFields.nama || db.anggota[index].nama_lengkap,
        alamat: updatedFields.alamat || updatedFields.alamat_lengkap || db.anggota[index].alamat,
        alamat_lengkap: updatedFields.alamat_lengkap || updatedFields.alamat || db.anggota[index].alamat_lengkap,
        status: updatedFields.status || updatedFields.status_keanggotaan || db.anggota[index].status,
        status_keanggotaan: updatedFields.status_keanggotaan || updatedFields.status || db.anggota[index].status_keanggotaan
      };
      saveDB(db);

      try {
        const client = getSupabaseClient();
        if (client) {
          await client.from('anggota').update({
            nama_lengkap: db.anggota[index].nama_lengkap,
            alamat_lengkap: db.anggota[index].alamat_lengkap,
            nomor_hp: db.anggota[index].nomor_hp,
            pekerjaan: db.anggota[index].pekerjaan,
            tempat_lahir: db.anggota[index].tempat_lahir,
            status_keanggotaan: db.anggota[index].status_keanggotaan
          }).or(`nomor_anggota.eq.${id},nomor_anggota.eq.${db.anggota[index].nomor_anggota}`);
        }
      } catch (err) {
        console.error('Supabase updateAnggota error:', err);
      }

      return db.anggota[index];
    }
    return null;
  },

  async deleteAnggota(id) {
    const db = getDB();
    const target = db.anggota.find((a) => a.id === id || a.nomor_anggota === id);
    const noAnggota = target ? target.nomor_anggota : id;

    db.anggota = db.anggota.filter((a) => a.id !== id && a.nomor_anggota !== id);
    // Hapus juga simpanan dan pinjaman terkait di lokal agar sinkron
    db.simpanan = db.simpanan.filter((s) => s.nomor_anggota !== noAnggota);
    db.pinjaman = db.pinjaman.filter((p) => p.nomor_anggota !== noAnggota);
    saveDB(db);

    try {
      const client = getSupabaseClient();
      if (client) {
        // Hapus di Supabase (relasi cascade di PostgreSQL akan otomatis membersihkan simpanan/pinjaman)
        const { error } = await client.from('anggota').delete().or(`nomor_anggota.eq.${noAnggota},nomor_anggota.eq.${id}`);
        if (error) {
          console.error('Supabase deleteAnggota error:', error.message);
        } else {
          console.log('Anggota berhasil dihapus permanen dari Supabase!');
        }
      }
    } catch (err) {
      console.error('Supabase deleteAnggota exception:', err);
    }

    return true;
  },

  // --- SIMPANAN ---
  getSimpananList() {
    const db = getDB();
    return db.simpanan || [];
  },

  getSimpananSummary() {
    const db = getDB();
    const list = db.simpanan || [];

    let totalPokok = 0;
    let totalWajib = 0;
    let totalSukarela = 0;

    list.forEach((item) => {
      const amount = Number(item.jumlah || 0);
      const isWithdrawal = item.tipe === 'Penarikan' || (item.keterangan || '').toLowerCase().includes('tarik');
      const val = isWithdrawal ? -amount : amount;

      const j = (item.jenis || '').toLowerCase();
      if (j.includes('pokok')) totalPokok += val;
      else if (j.includes('wajib')) totalWajib += val;
      else if (j.includes('sukarela')) totalSukarela += val;
    });

    return {
      pokok: totalPokok,
      wajib: totalWajib,
      sukarela: totalSukarela,
      total: totalPokok + totalWajib + totalSukarela
    };
  },

  getSimpananByAnggota(nomor_anggota) {
    const db = getDB();
    return (db.simpanan || []).filter((s) => s.nomor_anggota === nomor_anggota);
  },

  addSimpananTransaction({ nomor_anggota, jenis, tipe = 'Setoran', jumlah, metode = 'Tunai', keterangan = '', pencatat = 'Admin' }) {
    const db = getDB();
    const anggota = db.anggota.find((a) => a.nomor_anggota === nomor_anggota || a.id === nomor_anggota);
    const nama_anggota = anggota ? (anggota.nama_lengkap || anggota.nama) : 'Anggota';
    const today = new Date().toISOString().split('T')[0];
    const simpananId = `SMP-${Date.now().toString().slice(-4)}`;

    const newSimpanan = {
      id: simpananId,
      nomor_anggota,
      nama_anggota,
      tanggal: today,
      jenis,
      tipe,
      jumlah: Number(jumlah),
      metode,
      pencatat,
      keterangan: keterangan || `${tipe} Simpanan ${jenis}`
    };

    db.simpanan.unshift(newSimpanan);

    const isPenerimaan = tipe === 'Setoran';
    const newKas = {
      id: `KAS-${Date.now().toString().slice(-4)}`,
      tanggal: today,
      jenis: isPenerimaan ? 'Penerimaan' : 'Pengeluaran',
      kategori: `Simpanan ${jenis}`,
      jumlah: Number(jumlah),
      keterangan: `${tipe} ${jenis} a/n ${nama_anggota} (${nomor_anggota})`,
      ref_id: simpananId
    };
    db.kas.unshift(newKas);

    saveDB(db);

    try {
      const client = getSupabaseClient();
      if (client) {
        client.from('simpanan').insert([{
          kode_transaksi: newSimpanan.id,
          nomor_anggota: newSimpanan.nomor_anggota,
          nama_anggota: newSimpanan.nama_anggota,
          tanggal: newSimpanan.tanggal,
          jenis_simpanan: newSimpanan.jenis,
          tipe: newSimpanan.tipe,
          jumlah: newSimpanan.jumlah,
          metode: newSimpanan.metode,
          pencatat: newSimpanan.pencatat,
          keterangan: newSimpanan.keterangan
        }]).then(() => {});

        client.from('kas').insert([{
          kode_transaksi: newKas.id,
          tanggal: newKas.tanggal,
          jenis: newKas.jenis,
          kategori: newKas.kategori,
          jumlah: newKas.jumlah,
          keterangan: newKas.keterangan,
          ref_id: newKas.ref_id
        }]).then(() => {});
      }
    } catch (_) {}

    return newSimpanan;
  },

  async deleteSimpananTransaction(id) {
    const db = getDB();
    const target = (db.simpanan || []).find((s) => s.id === id || s.kode_transaksi === id);
    if (!target) return false;
    const targetId = target.id || target.kode_transaksi || id;

    db.simpanan = (db.simpanan || []).filter((s) => s.id !== targetId && s.kode_transaksi !== targetId);
    db.kas = (db.kas || []).filter((k) => k.ref_id !== targetId && k.id !== targetId);
    saveDB(db);

    try {
      const client = getSupabaseClient();
      if (client) {
        await client.from('simpanan').delete().or(`kode_transaksi.eq.${targetId},id.eq.${targetId}`);
        await client.from('kas').delete().or(`ref_id.eq.${targetId}`);
      }
    } catch (err) {
      console.error('Supabase deleteSimpanan error:', err);
    }
    return true;
  },

  async deleteMultipleSimpanan(ids = []) {
    if (!ids || ids.length === 0) return true;
    const db = getDB();
    const idSet = new Set(ids);

    db.simpanan = (db.simpanan || []).filter((s) => !idSet.has(s.id) && !idSet.has(s.kode_transaksi));
    db.kas = (db.kas || []).filter((k) => !idSet.has(k.ref_id) && !idSet.has(k.id));
    saveDB(db);

    try {
      const client = getSupabaseClient();
      if (client) {
        for (const id of ids) {
          await client.from('simpanan').delete().or(`kode_transaksi.eq.${id},id.eq.${id}`);
          await client.from('kas').delete().or(`ref_id.eq.${id}`);
        }
      }
    } catch (err) {
      console.error('Supabase deleteMultipleSimpanan error:', err);
    }
    return true;
  },

  // --- PINJAMAN ---
  getPinjamanList() {
    const db = getDB();
    return db.pinjaman || [];
  },

  getPinjamanSummary() {
    const db = getDB();
    const list = db.pinjaman || [];

    let totalBerjalan = 0;
    let totalLunas = 0;
    let totalDiajukan = 0;
    let totalSisaHutang = 0;

    list.forEach((p) => {
      const j = Number(p.jumlah || 0);
      const s = Number(p.sisa_hutang || 0);
      if (p.status === 'Berjalan') {
        totalBerjalan += j;
        totalSisaHutang += s;
      } else if (p.status === 'Lunas') {
        totalLunas += j;
      } else if (p.status === 'Diajukan') {
        totalDiajukan += j;
      }
    });

    return {
      berjalan: totalBerjalan,
      lunas: totalLunas,
      diajukan: totalDiajukan,
      sisaHutang: totalSisaHutang
    };
  },

  getPinjamanByAnggota(nomor_anggota) {
    const db = getDB();
    return (db.pinjaman || []).filter((p) => p.nomor_anggota === nomor_anggota);
  },

  applyPinjaman(params) {
    return this.addPinjaman(params);
  },

  addPinjaman({ nomor_anggota, jumlah, bunga, tenor, keperluan = '', metodeBunga = 'menurun', pembulatan = 50000 }) {
    const db = getDB();
    const anggota = db.anggota.find((a) => (a.nomor_anggota || a.id) === nomor_anggota);
    const nama = anggota ? (anggota.nama_lengkap || anggota.nama) : 'Anggota';
    const today = new Date().toISOString().split('T')[0];
    const id = `PJ-${new Date().getFullYear()}-${String(db.pinjaman.length + 1).padStart(3, '0')}`;

    const numJumlah = Number(jumlah);
    const numBungaPercent = Number(bunga !== undefined && bunga !== '' ? bunga : (db.settings.sukuBungaPinjaman || 2.5));
    const numTenor = Number(tenor || 12);

    const sim = hitungSimulasiPinjaman(numJumlah, numTenor, numBungaPercent, metodeBunga, Number(pembulatan));

    const newPinjaman = {
      id,
      nomor_pinjaman: id,
      nomor_anggota,
      nama,
      tanggal: today,
      jumlah: numJumlah,
      bunga: numBungaPercent,
      tenor: numTenor,
      metode_bunga: metodeBunga,
      pembulatan: Number(pembulatan),
      angsuran_pokok: sim.pokokPerBulan,
      angsuran_bunga: sim.bungaBulanPertama,
      total_angsuran_bulanan: sim.angsuranBulanPertama,
      total_pinjaman: sim.totalPengembalian,
      total_bunga: sim.totalBunga,
      total_terbayar: 0,
      sisa_hutang: sim.totalPengembalian,
      jadwal_angsuran: sim.jadwal,
      status: 'Diajukan',
      keperluan,
      riwayat_angsuran: []
    };

    db.pinjaman.unshift(newPinjaman);
    saveDB(db);

    try {
      const client = getSupabaseClient();
      if (client) {
        client.from('pinjaman').insert([{
          nomor_pinjaman: newPinjaman.nomor_pinjaman,
          nomor_anggota: newPinjaman.nomor_anggota,
          nama: newPinjaman.nama,
          tanggal_pengajuan: newPinjaman.tanggal,
          jumlah: newPinjaman.jumlah,
          bunga: newPinjaman.bunga,
          tenor: newPinjaman.tenor,
          angsuran_pokok: newPinjaman.angsuran_pokok,
          angsuran_bunga: newPinjaman.angsuran_bunga,
          total_angsuran_bulanan: newPinjaman.total_angsuran_bulanan,
          total_pinjaman: newPinjaman.total_pinjaman,
          total_terbayar: 0,
          sisa_hutang: newPinjaman.sisa_hutang,
          status: newPinjaman.status,
          keperluan: newPinjaman.keperluan
        }]).then(() => {});
      }
    } catch (_) {}

    return newPinjaman;
  },

  updatePinjamanStatus(pinjamanId, newStatus) {
    const db = getDB();
    const item = db.pinjaman.find((p) => p.id === pinjamanId || p.nomor_pinjaman === pinjamanId);
    if (!item) return null;

    const oldStatus = item.status;
    item.status = newStatus;

    if (newStatus === 'Berjalan' && oldStatus !== 'Berjalan') {
      const today = new Date().toISOString().split('T')[0];
      const newKas = {
        id: `KAS-${Date.now().toString().slice(-4)}`,
        tanggal: today,
        jenis: 'Pengeluaran',
        kategori: 'Pencairan Pinjaman',
        jumlah: Number(item.jumlah),
        keterangan: `Pencairan Pinjaman ${item.nama} (${item.nomor_pinjaman})`,
        ref_id: item.id
      };
      db.kas.unshift(newKas);

      try {
        const client = getSupabaseClient();
        if (client) {
          client.from('kas').insert([{
            kode_transaksi: newKas.id,
            tanggal: newKas.tanggal,
            jenis: newKas.jenis,
            kategori: newKas.kategori,
            jumlah: newKas.jumlah,
            keterangan: newKas.keterangan,
            ref_id: newKas.ref_id
          }]).then(() => {});
        }
      } catch (_) {}
    }

    saveDB(db);

    try {
      const client = getSupabaseClient();
      if (client) {
        client.from('pinjaman').update({ status: newStatus }).eq('nomor_pinjaman', item.nomor_pinjaman).then(() => {});
      }
    } catch (_) {}

    return item;
  },

  getPinjamanJadwalAkumulasi(pinjamanId) {
    const db = getDB();
    const item = db.pinjaman.find((p) => p.id === pinjamanId || p.nomor_pinjaman === pinjamanId);
    if (!item) return [];
    return hitungJadwalAkumulasiPinjaman(item);
  },

  payPinjamanInstallment({ pinjamanId, jumlahBayar, metode = 'Tunai', penerima = 'Admin Kasir', angsuranKe = null, pokok = null, bunga = null, keterangan = '' }) {
    const db = getDB();
    const item = db.pinjaman.find((p) => p.id === pinjamanId || p.nomor_pinjaman === pinjamanId);
    if (!item) return null;

    const payAmount = Number(jumlahBayar);
    const today = new Date().toISOString().split('T')[0];
    const angsId = `ANGS-${Date.now().toString().slice(-4)}`;
    const actualAngsuranKe = angsuranKe ? Number(angsuranKe) : ((item.riwayat_angsuran ? item.riwayat_angsuran.length : 0) + 1);
    const desc = keterangan || `Angsuran ke-${actualAngsuranKe} Pinjaman ${item.nama} (${item.nomor_pinjaman})`;

    const angsuranRecord = {
      id: angsId,
      tanggal: today,
      angsuran_ke: actualAngsuranKe,
      jumlah: payAmount,
      pokok: pokok !== null && pokok !== undefined ? Number(pokok) : undefined,
      bunga: bunga !== null && bunga !== undefined ? Number(bunga) : undefined,
      metode,
      penerima,
      keterangan: desc
    };

    if (!item.riwayat_angsuran) item.riwayat_angsuran = [];
    item.riwayat_angsuran.push(angsuranRecord);

    item.total_terbayar = (Number(item.total_terbayar) || 0) + payAmount;
    item.sisa_hutang = Math.max(0, (Number(item.total_pinjaman) || 0) - item.total_terbayar);

    if (item.sisa_hutang <= 0) {
      item.status = 'Lunas';
    }

    const newKas = {
      id: `KAS-${Date.now().toString().slice(-4)}`,
      tanggal: today,
      jenis: 'Penerimaan',
      kategori: 'Angsuran Pinjaman',
      jumlah: payAmount,
      keterangan: desc,
      ref_id: angsId
    };
    db.kas.unshift(newKas);

    saveDB(db);

    try {
      const client = getSupabaseClient();
      if (client) {
        client.from('riwayat_angsuran').insert([{
          nomor_pinjaman: item.nomor_pinjaman,
          angsuran_ke: angsuranRecord.angsuran_ke,
          tanggal: angsuranRecord.tanggal,
          jumlah: angsuranRecord.jumlah,
          metode: angsuranRecord.metode,
          penerima: angsuranRecord.penerima
        }]).then(() => {});

        client.from('pinjaman').update({
          total_terbayar: item.total_terbayar,
          sisa_hutang: item.sisa_hutang,
          status: item.status
        }).eq('nomor_pinjaman', item.nomor_pinjaman).then(() => {});

        client.from('kas').insert([{
          kode_transaksi: newKas.id,
          tanggal: newKas.tanggal,
          jenis: newKas.jenis,
          kategori: newKas.kategori,
          jumlah: newKas.jumlah,
          keterangan: newKas.keterangan,
          ref_id: newKas.ref_id
        }]).then(() => {});
      }
    } catch (_) {}

    return item;
  },

  deletePinjamanInstallment(pinjamanId, angsuranId) {
    const db = getDB();
    const item = db.pinjaman.find((p) => p.id === pinjamanId || p.nomor_pinjaman === pinjamanId);
    if (!item || !item.riwayat_angsuran) return null;

    const angsuran = item.riwayat_angsuran.find((a) => a.id === angsuranId);
    if (!angsuran) return null;

    item.riwayat_angsuran = item.riwayat_angsuran.filter((a) => a.id !== angsuranId);
    item.total_terbayar = Math.max(0, (Number(item.total_terbayar) || 0) - Number(angsuran.jumlah || 0));
    item.sisa_hutang = Math.max(0, (Number(item.total_pinjaman) || 0) - item.total_terbayar);
    if (item.sisa_hutang > 0 && item.status === 'Lunas') {
      item.status = 'Berjalan';
    }

    db.kas = (db.kas || []).filter((k) => k.ref_id !== angsuranId);
    saveDB(db);

    try {
      const client = getSupabaseClient();
      if (client) {
        client.from('riwayat_angsuran').delete().eq('nomor_pinjaman', item.nomor_pinjaman).eq('angsuran_ke', angsuran.angsuran_ke).then(() => {});
        client.from('pinjaman').update({
          total_terbayar: item.total_terbayar,
          sisa_hutang: item.sisa_hutang,
          status: item.status
        }).eq('nomor_pinjaman', item.nomor_pinjaman).then(() => {});
        client.from('kas').delete().eq('ref_id', angsuranId).then(() => {});
      }
    } catch (_) {}

    return item;
  },

  // --- KAS HARIAN ---
  getKasList() {
    const db = getDB();
    return db.kas || [];
  },

  getKasSummary() {
    const db = getDB();
    const list = db.kas || [];

    let totalMasuk = 0;
    let totalKeluar = 0;

    list.forEach((k) => {
      const amount = Number(k.jumlah || 0);
      if (k.jenis === 'Penerimaan') {
        totalMasuk += amount;
      } else {
        totalKeluar += amount;
      }
    });

    return {
      masuk: totalMasuk,
      keluar: totalKeluar,
      saldo: totalMasuk - totalKeluar
    };
  },

  addKasTransaction({ jenis, kategori, jumlah, keterangan, tanggal }) {
    const db = getDB();
    const today = tanggal || new Date().toISOString().split('T')[0];
    const newKas = {
      id: `KAS-${Date.now().toString().slice(-4)}`,
      tanggal: today,
      jenis,
      kategori: kategori || 'Operasional',
      jumlah: Number(jumlah),
      keterangan: keterangan || '-',
      ref_id: ''
    };

    db.kas.unshift(newKas);
    saveDB(db);

    try {
      const client = getSupabaseClient();
      if (client) {
        client.from('kas').insert([{
          kode_transaksi: newKas.id,
          tanggal: newKas.tanggal,
          jenis: newKas.jenis,
          kategori: newKas.kategori,
          jumlah: newKas.jumlah,
          keterangan: newKas.keterangan,
          ref_id: newKas.ref_id
        }]).then(() => {});
      }
    } catch (_) {}

    return newKas;
  },

  // --- PENGATURAN & BACKUP ---
  getSettings() {
    const db = getDB();
    return db.settings || initialData.settings;
  },

  updateSettings(newSettings) {
    const db = getDB();
    db.settings = { ...db.settings, ...newSettings };
    saveDB(db);

    try {
      const client = getSupabaseClient();
      if (client) {
        const payload = {
          nama_koperasi: db.settings.namaKoperasi,
          badan_hukum: db.settings.badanHukum,
          alamat: db.settings.alamat,
          telepon: db.settings.telepon,
          email: db.settings.email,
          ketua: db.settings.ketua,
          sekretaris: db.settings.sekretaris,
          bendahara: db.settings.bendahara,
          pengawas: db.settings.pengawas,
          simpanan_pokok: db.settings.simpananPokok,
          simpanan_wajib: db.settings.simpananWajib,
          suku_bunga_pinjaman: db.settings.sukuBungaPinjaman,
          shu_persen_anggota: db.settings.shuPersenAnggota,
          shu_persen_modal: db.settings.shuPersenModal,
          shu_persen_pengurus: db.settings.shuPersenPengurus,
          shu_persen_cadangan: db.settings.shuPersenCadangan
        };

        client.from('settings').select('id').limit(1).then(({ data: existingRows }) => {
          if (existingRows && existingRows.length > 0) {
            client.from('settings').update(payload).eq('id', existingRows[0].id).then(() => {});
          } else {
            client.from('settings').insert([payload]).then(() => {});
          }
        });
      }
    } catch (_) {}

    return db.settings;
  },

  exportDatabaseJSON() {
    const db = getDB();
    return JSON.stringify(db, null, 2);
  },

  importDatabaseJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.anggota || !parsed.simpanan || !parsed.kas) {
        throw new Error('Format file backup tidak valid');
      }
      saveDB(parsed);
      return { success: true };
    } catch (e) {
      return { success: false, message: e.message };
    }
  },

  // Clear all data (Anggota, Simpanan, Pinjaman, Kas)
  clearAllData() {
    const db = getDB();
    const emptyState = {
      settings: db.settings || initialData.settings,
      anggota: [],
      simpanan: [],
      pinjaman: [],
      kas: []
    };
    saveDB(emptyState);
    return emptyState;
  },

  resetDatabase() {
    saveDB(initialData);
    return initialData;
  },

  // --- LAPORAN PERHITUNGAN REALTIME ---
  getLaporanData(startDateOrFilter = '', endDate = '') {
    let start = '';
    let end = '';

    if (typeof startDateOrFilter === 'object' && startDateOrFilter !== null) {
      start = startDateOrFilter.startDate || startDateOrFilter.tanggalMulai || '';
      end = startDateOrFilter.endDate || startDateOrFilter.tanggalSelesai || '';
    } else {
      start = startDateOrFilter || '';
      end = endDate || '';
    }

    const db = getDB();
    const kasList = db.kas || [];
    const simpananList = db.simpanan || [];
    const pinjamanList = db.pinjaman || [];

    const filterFn = (itemDate) => {
      if (!itemDate) return true;
      if (start && itemDate < start) return false;
      if (end && itemDate > end) return false;
      return true;
    };

    let totalSimpananMasuk = 0;
    let totalAngsuranMasuk = 0;
    let totalPendapatanLain = 0;
    let totalPenyaluranPinjaman = 0;
    let totalBiayaOperasional = 0;
    let totalPenarikanSimpanan = 0;

    kasList.filter((k) => filterFn(k.tanggal)).forEach((k) => {
      const amt = Number(k.jumlah || 0);
      const kat = (k.kategori || '').toLowerCase();
      if (k.jenis === 'Penerimaan') {
        if (kat.includes('simpanan')) totalSimpananMasuk += amt;
        else if (kat.includes('angsuran')) totalAngsuranMasuk += amt;
        else totalPendapatanLain += amt;
      } else {
        if (kat.includes('pencairan') || kat.includes('pinjaman')) totalPenyaluranPinjaman += amt;
        else if (kat.includes('tarik') || kat.includes('penarikan')) totalPenarikanSimpanan += amt;
        else totalBiayaOperasional += amt;
      }
    });

    const kasSummary = this.getKasSummary();
    const simpananSummary = this.getSimpananSummary();
    const pinjamanSummary = this.getPinjamanSummary();

    let totalBungaTerkumpul = 0;
    pinjamanList.forEach((p) => {
      if (p.riwayat_angsuran && p.riwayat_angsuran.length > 0) {
        const matchingAngsuran = p.riwayat_angsuran.filter((a) => filterFn(a.tanggal));
        totalBungaTerkumpul += matchingAngsuran.length * (p.angsuran_bunga || 0);
      }
    });

    const totalPendapatanKoperasi = totalBungaTerkumpul + totalPendapatanLain;
    const estimasiSHUKotor = Math.max(0, totalPendapatanKoperasi - totalBiayaOperasional);

    return {
      arusKas: {
        totalSimpananMasuk,
        totalAngsuranMasuk,
        totalPendapatanLain,
        totalPemasukan: totalSimpananMasuk + totalAngsuranMasuk + totalPendapatanLain,
        totalPenyaluranPinjaman,
        totalBiayaOperasional,
        totalPenarikanSimpanan,
        totalPengeluaran: totalPenyaluranPinjaman + totalBiayaOperasional + totalPenarikanSimpanan,
        saldoKasBersih: (totalSimpananMasuk + totalAngsuranMasuk + totalPendapatanLain) - (totalPenyaluranPinjaman + totalBiayaOperasional + totalPenarikanSimpanan)
      },
      neraca: {
        kas: kasSummary.saldo,
        piutangPinjaman: pinjamanSummary.sisaHutang,
        totalAset: kasSummary.saldo + pinjamanSummary.sisaHutang,
        simpananPokok: simpananSummary.pokok,
        simpananWajib: simpananSummary.wajib,
        simpananSukarela: simpananSummary.sukarela,
        totalKewajibanModal: simpananSummary.total
      },
      shu: {
        pendapatanBunga: totalBungaTerkumpul,
        pendapatanLain: totalPendapatanLain,
        totalPendapatan: totalPendapatanKoperasi,
        biayaOperasional: totalBiayaOperasional,
        shuBersih: estimasiSHUKotor,
        alokasi: {
          anggota: Math.round(estimasiSHUKotor * (db.settings.shuPersenAnggota / 100)),
          modal: Math.round(estimasiSHUKotor * (db.settings.shuPersenModal / 100)),
          pengurus: Math.round(estimasiSHUKotor * (db.settings.shuPersenPengurus / 100)),
          cadangan: Math.round(estimasiSHUKotor * (db.settings.shuPersenCadangan / 100))
        }
      }
    };
  },

  // --- UNIT USAHA TOKO SEMBAKO ---
  getSembakoProdukList() {
    const db = getDB();
    return db.sembako_produk || [];
  },

  async addSembakoProduk(produkData) {
    const db = getDB();
    const newProduk = {
      id: `PRD-${Date.now().toString().slice(-4)}`,
      kode_produk: `PRD-${Date.now().toString().slice(-4)}`,
      nama: produkData.nama,
      kategori: produkData.kategori || 'Umum',
      satuan: produkData.satuan || 'Pcs',
      harga_beli: Number(produkData.harga_beli) || 0,
      harga_jual: Number(produkData.harga_jual) || 0,
      stok: Number(produkData.stok) || 0
    };
    db.sembako_produk.push(newProduk);
    saveDB(db);

    try {
      const client = getSupabaseClient();
      if (client) {
        await client.from('sembako_produk').insert([{
          kode_produk: newProduk.id,
          nama: newProduk.nama,
          kategori: newProduk.kategori,
          satuan: newProduk.satuan,
          harga_beli: newProduk.harga_beli,
          harga_jual: newProduk.harga_jual,
          stok: newProduk.stok
        }]);
      }
    } catch (err) {
      console.error('Supabase addSembakoProduk error:', err);
    }

    return newProduk;
  },

  async updateSembakoProduk(id, updatedData) {
    const db = getDB();
    const idx = db.sembako_produk.findIndex((p) => p.id === id || p.kode_produk === id);
    if (idx !== -1) {
      db.sembako_produk[idx] = {
        ...db.sembako_produk[idx],
        ...updatedData,
        harga_beli: Number(updatedData.harga_beli ?? db.sembako_produk[idx].harga_beli),
        harga_jual: Number(updatedData.harga_jual ?? db.sembako_produk[idx].harga_jual),
        stok: Number(updatedData.stok ?? db.sembako_produk[idx].stok)
      };
      saveDB(db);

      try {
        const client = getSupabaseClient();
        if (client) {
          await client.from('sembako_produk').update({
            nama: db.sembako_produk[idx].nama,
            kategori: db.sembako_produk[idx].kategori,
            satuan: db.sembako_produk[idx].satuan,
            harga_beli: db.sembako_produk[idx].harga_beli,
            harga_jual: db.sembako_produk[idx].harga_jual,
            stok: db.sembako_produk[idx].stok
          }).or(`kode_produk.eq.${id},kode_produk.eq.${db.sembako_produk[idx].kode_produk || id}`);
        }
      } catch (err) {
        console.error('Supabase updateSembakoProduk error:', err);
      }

      return db.sembako_produk[idx];
    }
    return null;
  },

  async deleteSembakoProduk(id) {
    const db = getDB();
    db.sembako_produk = db.sembako_produk.filter((p) => p.id !== id && p.kode_produk !== id);
    saveDB(db);

    try {
      const client = getSupabaseClient();
      if (client) {
        await client.from('sembako_produk').delete().or(`kode_produk.eq.${id},id.eq.${id}`);
      }
    } catch (err) {
      console.error('Supabase deleteSembakoProduk error:', err);
    }
  },

  getSembakoTransaksiList() {
    const db = getDB();
    return db.sembako_transaksi || [];
  },

  async addSembakoTransaksi({ pembeli, nomor_anggota = '', items = [], total, bayar, kembali, metode = 'Tunai' }) {
    const db = getDB();
    const today = new Date().toISOString().split('T')[0];
    const newTx = {
      id: `SMB-${Date.now().toString().slice(-6)}`,
      tanggal: today,
      pembeli: pembeli || 'Umum',
      nomor_anggota: nomor_anggota || '-',
      items: items || [],
      total: Number(total),
      bayar: Number(bayar),
      kembali: Number(kembali),
      metode
    };

    // Kurangi stok barang lokal
    items.forEach((item) => {
      const prod = db.sembako_produk.find((p) => p.id === item.id || p.kode_produk === item.id);
      if (prod) {
        prod.stok = Math.max(0, prod.stok - Number(item.qty || 1));
      }
    });

    db.sembako_transaksi.unshift(newTx);

    // Integrasi otomatis ke Kas Koperasi (Penerimaan)
    const newKas = {
      id: `KAS-${Date.now().toString().slice(-4)}`,
      tanggal: today,
      jenis: 'Penerimaan',
      kategori: 'Penjualan Sembako',
      jumlah: Number(total),
      keterangan: `Penjualan Sembako (${newTx.id}) - ${pembeli}`,
      ref_id: newTx.id
    };
    db.kas.unshift(newKas);

    saveDB(db);

    try {
      const client = getSupabaseClient();
      if (client) {
        await client.from('sembako_transaksi').insert([{
          kode_transaksi: newTx.id,
          tanggal: newTx.tanggal,
          pembeli: newTx.pembeli,
          nomor_anggota: newTx.nomor_anggota,
          items: newTx.items,
          total: newTx.total,
          bayar: newTx.bayar,
          kembali: newTx.kembali,
          metode: newTx.metode
        }]);

        await client.from('kas').insert([{
          kode_transaksi: newKas.id,
          tanggal: newKas.tanggal,
          jenis: newKas.jenis,
          kategori: newKas.kategori,
          jumlah: newKas.jumlah,
          keterangan: newKas.keterangan,
          ref_id: newKas.ref_id
        }]);

        // Sync stok ke Supabase
        for (const item of items) {
          const prod = db.sembako_produk.find((p) => p.id === item.id || p.kode_produk === item.id);
          if (prod) {
            await client.from('sembako_produk').update({ stok: prod.stok }).eq('kode_produk', prod.kode_produk || prod.id);
          }
        }
      }
    } catch (err) {
      console.error('Supabase sembako transaksi insert error:', err);
    }

    return newTx;
  },

  // --- PROGRAM TITIPAN TABUNGAN QURBAN ---
  getQurbanPesertaList() {
    const db = getDB();
    return db.qurban_peserta || [];
  },

  async addQurbanPeserta({ nama, nomor_anggota = '', tipe_hewan, target_nominal, tahun_qurban = '1448 H / 2026' }) {
    const db = getDB();
    const today = new Date().toISOString().split('T')[0];
    const targetNom = Number(target_nominal) || 3500000;
    const newPeserta = {
      id: `QRB-${Date.now().toString().slice(-4)}`,
      kode_peserta: `QRB-${Date.now().toString().slice(-4)}`,
      nama,
      nomor_anggota: nomor_anggota || '-',
      tipe_hewan: tipe_hewan || '1 Ekor Kambing / Domba',
      target_hewan: tipe_hewan || '1 Ekor Kambing / Domba',
      target_nominal: targetNom,
      total_terkumpul: 0,
      sisa_target: targetNom,
      status: 'Berjalan',
      tahun_qurban,
      tahun_target: tahun_qurban,
      tanggal_daftar: today
    };

    db.qurban_peserta.unshift(newPeserta);
    saveDB(db);

    try {
      const client = getSupabaseClient();
      if (client) {
        await client.from('qurban_peserta').insert([{
          kode_peserta: newPeserta.id,
          nomor_anggota: newPeserta.nomor_anggota,
          nama: newPeserta.nama,
          tipe_hewan: newPeserta.tipe_hewan,
          target_nominal: newPeserta.target_nominal,
          total_terkumpul: 0,
          sisa_target: newPeserta.target_nominal,
          tahun_qurban: newPeserta.tahun_qurban,
          status: 'Berjalan',
          tanggal_daftar: newPeserta.tanggal_daftar
        }]);
      }
    } catch (err) {
      console.error('Supabase addQurbanPeserta error:', err);
    }

    return newPeserta;
  },

  async setorTabunganQurban({ peserta_id, jumlah, metode = 'Tunai', keterangan = 'Setoran Tabungan Qurban' }) {
    const db = getDB();
    const today = new Date().toISOString().split('T')[0];
    const peserta = db.qurban_peserta.find((p) => p.id === peserta_id || p.kode_peserta === peserta_id);
    if (!peserta) throw new Error('Peserta Qurban tidak ditemukan');

    const amount = Number(jumlah);
    peserta.total_terkumpul = (Number(peserta.total_terkumpul) || 0) + amount;
    peserta.sisa_target = Math.max(0, (Number(peserta.target_nominal) || 0) - peserta.total_terkumpul);
    if (peserta.total_terkumpul >= peserta.target_nominal && (peserta.status === 'Menabung' || peserta.status === 'Berjalan')) {
      peserta.status = 'Tercapai';
    }

    const newMutasi = {
      id: `QST-${Date.now().toString().slice(-6)}`,
      kode_mutasi: `QST-${Date.now().toString().slice(-6)}`,
      peserta_id: peserta.kode_peserta || peserta.id,
      nama_peserta: peserta.nama,
      nomor_anggota: peserta.nomor_anggota || '-',
      tanggal: today,
      tipe: 'Setoran',
      jumlah: amount,
      metode,
      keterangan
    };

    db.qurban_mutasi.unshift(newMutasi);

    // Integrasi ke Buku Kas
    const newKas = {
      id: `KAS-${Date.now().toString().slice(-4)}`,
      tanggal: today,
      jenis: 'Penerimaan',
      kategori: 'Tabungan Qurban',
      jumlah: amount,
      keterangan: `Setoran Tabungan Qurban a.n ${peserta.nama} (${newMutasi.id})`,
      ref_id: newMutasi.id
    };
    db.kas.unshift(newKas);

    saveDB(db);

    try {
      const client = getSupabaseClient();
      if (client) {
        await client.from('qurban_mutasi').insert([{
          kode_mutasi: newMutasi.id,
          peserta_id: newMutasi.peserta_id,
          nomor_anggota: newMutasi.nomor_anggota,
          nama_peserta: newMutasi.nama_peserta,
          tanggal: newMutasi.tanggal,
          tipe: newMutasi.tipe,
          jumlah: newMutasi.jumlah,
          metode: newMutasi.metode,
          keterangan: newMutasi.keterangan
        }]);

        await client.from('qurban_peserta').update({
          total_terkumpul: peserta.total_terkumpul,
          sisa_target: peserta.sisa_target,
          status: peserta.status
        }).or(`kode_peserta.eq.${peserta.kode_peserta || peserta.id},id.eq.${peserta.id}`);

        await client.from('kas').insert([{
          kode_transaksi: newKas.id,
          tanggal: newKas.tanggal,
          jenis: newKas.jenis,
          kategori: newKas.kategori,
          jumlah: newKas.jumlah,
          keterangan: newKas.keterangan,
          ref_id: newKas.ref_id
        }]);
      }
    } catch (err) {
      console.error('Supabase setorTabunganQurban error:', err);
    }

    return newMutasi;
  },

  async salurkanQurban({ peserta_id, keterangan = 'Penyaluran / Pembelian Hewan Qurban' }) {
    const db = getDB();
    const today = new Date().toISOString().split('T')[0];
    const peserta = db.qurban_peserta.find((p) => p.id === peserta_id || p.kode_peserta === peserta_id);
    if (!peserta) throw new Error('Peserta Qurban tidak ditemukan');

    const amount = Number(peserta.total_terkumpul);
    peserta.status = 'Tersalurkan';

    const newMutasi = {
      id: `QSL-${Date.now().toString().slice(-6)}`,
      kode_mutasi: `QSL-${Date.now().toString().slice(-6)}`,
      peserta_id: peserta.kode_peserta || peserta.id,
      nama_peserta: peserta.nama,
      nomor_anggota: peserta.nomor_anggota || '-',
      tanggal: today,
      tipe: 'Penyaluran',
      jumlah: amount,
      keterangan: `${keterangan} - ${peserta.tipe_hewan || peserta.target_hewan || ''}`
    };

    db.qurban_mutasi.unshift(newMutasi);

    // Kas Keluar untuk Pembelian Hewan Qurban
    const newKas = {
      id: `KAS-${Date.now().toString().slice(-4)}`,
      tanggal: today,
      jenis: 'Pengeluaran',
      kategori: 'Penyaluran Qurban',
      jumlah: amount,
      keterangan: `Pembelian Hewan Qurban a.n ${peserta.nama} (${peserta.tipe_hewan || peserta.target_hewan || ''})`,
      ref_id: newMutasi.id
    };
    db.kas.unshift(newKas);

    saveDB(db);

    try {
      const client = getSupabaseClient();
      if (client) {
        await client.from('qurban_mutasi').insert([{
          kode_mutasi: newMutasi.id,
          peserta_id: newMutasi.peserta_id,
          nomor_anggota: newMutasi.nomor_anggota,
          nama_peserta: newMutasi.nama_peserta,
          tanggal: newMutasi.tanggal,
          tipe: newMutasi.tipe,
          jumlah: newMutasi.jumlah,
          keterangan: newMutasi.keterangan
        }]);

        await client.from('qurban_peserta').update({
          status: 'Tersalurkan'
        }).or(`kode_peserta.eq.${peserta.kode_peserta || peserta.id},id.eq.${peserta.id}`);

        await client.from('kas').insert([{
          kode_transaksi: newKas.id,
          tanggal: newKas.tanggal,
          jenis: newKas.jenis,
          kategori: newKas.kategori,
          jumlah: newKas.jumlah,
          keterangan: newKas.keterangan,
          ref_id: newKas.ref_id
        }]);
      }
    } catch (err) {
      console.error('Supabase salurkanQurban error:', err);
    }

    return newMutasi;
  },

  getQurbanMutasiList() {
    const db = getDB();
    return db.qurban_mutasi || [];
  },

  getUsahaSummary() {
    const db = getDB();
    const sembakoTx = db.sembako_transaksi || [];
    const qurbanPeserta = db.qurban_peserta || [];

    const totalOmzetSembako = sembakoTx.reduce((acc, t) => acc + (Number(t.total) || 0), 0);
    const totalTransaksiSembako = sembakoTx.length;

    const totalDanaQurbanTerkumpul = qurbanPeserta.reduce((acc, p) => acc + (Number(p.total_terkumpul) || 0), 0);
    const pesertaQurbanAktif = qurbanPeserta.filter((p) => p.status !== 'Tersalurkan').length;
    const pesertaQurbanTersalurkan = qurbanPeserta.filter((p) => p.status === 'Tersalurkan').length;

    return {
      sembako: {
        totalOmzet: totalOmzetSembako,
        totalTransaksi: totalTransaksiSembako,
        totalProduk: (db.sembako_produk || []).length
      },
      qurban: {
        totalTerkumpul: totalDanaQurbanTerkumpul,
        pesertaAktif: pesertaQurbanAktif,
        pesertaTersalurkan: pesertaQurbanTersalurkan,
        totalPeserta: qurbanPeserta.length
      }
    };
  },

  // --- DAFTAR TAGIHAN & POTONGAN BULANAN ANGGOTA ---
  getTagihanBulanan(monthStr = '') {
    const db = getDB();
    const d = new Date();
    const currentMonth = monthStr || `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const overrides = db.tagihan_override?.[currentMonth] || {};
    const defaultWajib = Number(db.settings?.simpananWajib) || 25000;

    const anggotaList = (db.anggota || []).filter(Boolean);
    const list = anggotaList.map((a, idx) => {
      if (!a) return null;
      const memberId = a.nomor_anggota || a.id || `M-${idx+1}`;
      const memberName = a.nama_lengkap || a.nama || 'Anggota';
      const custom = overrides[memberId] || {};

      // 1. Simpanan Wajib
      const wajib = custom.wajib !== undefined ? Number(custom.wajib) : defaultWajib;

      // 2. Simpanan Sukarela
      let autoSukarela = 0;
      (db.simpanan || []).forEach((s) => {
        if (!s) return;
        if ((s.nomor_anggota === memberId || s.nama_anggota === memberName || s.nama_anggota === a.nama_lengkap || s.nama_anggota === a.nama) &&
            s.jenis === 'Sukarela' && s.tipe === 'Setoran' && (s.tanggal || '').startsWith(currentMonth)) {
          autoSukarela += Number(s.jumlah || 0);
        }
      });
      const sukarela = custom.sukarela !== undefined ? Number(custom.sukarela) : autoSukarela;

      // 3. Tabungan Qurban
      let autoQurban = 0;
      (db.qurban_mutasi || []).forEach((q) => {
        if (!q) return;
        if ((q.nomor_anggota === memberId || q.nama_peserta === memberName || q.nama_peserta === a.nama_lengkap || q.nama_peserta === a.nama) &&
            q.tipe === 'Setoran' && (q.tanggal || '').startsWith(currentMonth)) {
          autoQurban += Number(q.jumlah || 0);
        }
      });
      const qurban = custom.qurban !== undefined ? Number(custom.qurban) : autoQurban;

      // 4. Pinjaman & Cicilan
      const activeLoan = (db.pinjaman || []).find((p) => 
        p && (p.nomor_anggota === memberId || p.nama === memberName || p.nama === a.nama_lengkap || p.nama === a.nama) && p.status === 'Berjalan'
      );

      let autoCicilanKe = '';
      let autoPokok = 0;
      let autoJasa = 0;

      if (activeLoan) {
        const dyn = hitungJadwalAkumulasiPinjaman(activeLoan);
        const nextItem = dyn.find((s) => s.status !== 'Lunas') || dyn[dyn.length - 1];
        if (nextItem) {
          autoCicilanKe = nextItem.bulanKe;
          const targetTotal = nextItem.status === 'Sebagian' ? nextItem.sisaKurang : nextItem.totalTagihan;
          autoPokok = Math.min(targetTotal, nextItem.pokok);
          autoJasa = Math.max(0, targetTotal - autoPokok);
        }
      }

      const cicilanKe = custom.cicilanKe !== undefined ? custom.cicilanKe : autoCicilanKe;
      const pokok = custom.pokok !== undefined ? Number(custom.pokok) : autoPokok;
      const jasa = custom.jasa !== undefined ? Number(custom.jasa) : autoJasa;

      // 5. Sembako
      let autoSembako = 0;
      (db.sembako_transaksi || []).forEach((st) => {
        if (!st) return;
        if ((st.nomor_anggota === memberId || st.pembeli === memberName || st.pembeli === a.nama_lengkap || st.pembeli === a.nama) &&
            (st.tanggal || '').startsWith(currentMonth)) {
          autoSembako += Number(st.total || 0);
        }
      });
      const sembako = custom.sembako !== undefined ? Number(custom.sembako) : autoSembako;

      // Total Jumlah
      const jumlah = wajib + sukarela + qurban + pokok + jasa + sembako;

      return {
        no: idx + 1,
        nomor_anggota: memberId,
        nama: memberName,
        wajib,
        sukarela,
        qurban,
        cicilanKe,
        pokok,
        jasa,
        sembako,
        jumlah
      };
    }).filter(Boolean);

    const totals = list.reduce((acc, row) => {
      acc.wajib += row.wajib;
      acc.sukarela += row.sukarela;
      acc.qurban += row.qurban;
      acc.pokok += row.pokok;
      acc.jasa += row.jasa;
      acc.sembako += row.sembako;
      acc.total += row.jumlah;
      return acc;
    }, { wajib: 0, sukarela: 0, qurban: 0, pokok: 0, jasa: 0, sembako: 0, total: 0 });

    return { list, totals, periode: currentMonth };
  },

  async saveTagihanItem(monthStr, nomor_anggota, itemData) {
    const db = getDB();
    const d = new Date();
    const currentMonth = monthStr || `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!db.tagihan_override) db.tagihan_override = {};
    if (!db.tagihan_override[currentMonth]) db.tagihan_override[currentMonth] = {};

    db.tagihan_override[currentMonth][nomor_anggota] = {
      ...(db.tagihan_override[currentMonth][nomor_anggota] || {}),
      ...itemData
    };
    saveDB(db);

    try {
      const client = getSupabaseClient();
      if (client && nomor_anggota) {
        await client.from('tagihan_override').upsert({
          periode: currentMonth,
          nomor_anggota,
          wajib: itemData.wajib !== undefined ? Number(itemData.wajib) : null,
          sukarela: itemData.sukarela !== undefined ? Number(itemData.sukarela) : null,
          qurban: itemData.qurban !== undefined ? Number(itemData.qurban) : null,
          cicilan_ke: itemData.cicilanKe ? Number(itemData.cicilanKe) : null,
          pokok: itemData.pokok !== undefined ? Number(itemData.pokok) : null,
          jasa: itemData.jasa !== undefined ? Number(itemData.jasa) : null,
          sembako: itemData.sembako !== undefined ? Number(itemData.sembako) : null
        }, { onConflict: 'periode,nomor_anggota' });
      }
    } catch (err) {
      console.error('Supabase saveTagihanItem error:', err);
    }

    return db.tagihan_override[currentMonth][nomor_anggota];
  }
};
