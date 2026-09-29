/**
 * Helper Format Angka & Mata Uang Rupiah Indonesia (Kaidah EYD & Akuntansi)
 * Serta Kalkulator Simulasi Pinjaman Bunga Menurun (Declining Balance) & Pembulatan Pokok
 */

// Format nominal menjadi "1.000", "10.000", "100.000" (pemisah ribuan titik baku Indonesia)
export function formatNominal(num) {
  if (num === null || num === undefined || num === '') return '0';
  let isNegative = false;
  let digits = '';

  if (typeof num === 'number') {
    const rounded = Math.round(num);
    isNegative = rounded < 0;
    digits = Math.abs(rounded).toString();
  } else {
    const str = String(num).trim();
    isNegative = str.startsWith('-');
    digits = str.replace(/[^0-9]/g, '');
  }

  if (!digits || digits === '0') return '0';

  const normalized = digits.replace(/^0+/, '') || '0';
  if (normalized === '0') return '0';

  const withDots = normalized.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return isNegative ? `-${withDots}` : withDots;
}

// Format menjadi "Rp 1.000", "Rp 10.000", "Rp 100.000"
export function formatRupiah(num, withPrefix = true) {
  if (num === null || num === undefined || num === '') {
    return withPrefix ? 'Rp 0' : '0';
  }

  let isNegative = false;
  let digits = '';

  if (typeof num === 'number') {
    const rounded = Math.round(num);
    isNegative = rounded < 0;
    digits = Math.abs(rounded).toString();
  } else {
    const str = String(num).trim();
    isNegative = str.startsWith('-');
    digits = str.replace(/[^0-9]/g, '');
  }

  if (!digits || digits === '0') {
    return withPrefix ? 'Rp 0' : '0';
  }

  const normalized = digits.replace(/^0+/, '') || '0';
  if (normalized === '0') {
    return withPrefix ? 'Rp 0' : '0';
  }

  const withDots = normalized.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  if (!withPrefix) {
    return isNegative ? `-${withDots}` : withDots;
  }
  return isNegative ? `-Rp ${withDots}` : `Rp ${withDots}`;
}

// Mengubah format string bertitik ("20.000") kembali menjadi integer murni (20000)
export function parseNominal(str) {
  if (!str) return 0;
  if (typeof str === 'number') return str;
  return Number(String(str).replace(/[^0-9]/g, '')) || 0;
}

// Konversi Angka ke Kata Terbilang Bahasa Indonesia (untuk Kuitansi / Kwitansi Resmi)
export function terbilang(angka) {
  const bilangan = [
    '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima',
    'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'
  ];

  const n = Math.floor(Math.abs(Number(angka) || 0));

  if (n < 12) {
    return bilangan[n];
  } else if (n < 20) {
    return `${terbilang(n - 10)} Belas`;
  } else if (n < 100) {
    return `${terbilang(Math.floor(n / 10))} Puluh ${bilangan[n % 10]}`.trim();
  } else if (n < 200) {
    return `Seratus ${terbilang(n - 100)}`.trim();
  } else if (n < 1000) {
    return `${terbilang(Math.floor(n / 100))} Ratus ${terbilang(n % 100)}`.trim();
  } else if (n < 2000) {
    return `Seribu ${terbilang(n - 1000)}`.trim();
  } else if (n < 1000000) {
    return `${terbilang(Math.floor(n / 1000))} Ribu ${terbilang(n % 1000)}`.trim();
  } else if (n < 1000000000) {
    return `${terbilang(Math.floor(n / 1000000))} Juta ${terbilang(n % 1000000)}`.trim();
  } else if (n < 1000000000000) {
    return `${terbilang(Math.floor(n / 1000000000))} Miliar ${terbilang(n % 1000000000)}`.trim();
  }
  return `${terbilang(Math.floor(n / 1000000000000))} Triliun ${terbilang(n % 1000000000000)}`.trim();
}

/**
 * Kalkulator Simulasi Angsuran Pinjaman:
 * - Pembulatan Pokok / Bulan (misal kelipatan 50.000 sehingga 833.333 jadi 850.000)
 * - Sistem Bunga Menurun (Bulan 1: Plafon x rate, Bulan selanjutnya: Sisa Pokok x rate)
 */
export function hitungSimulasiPinjaman(jumlahPlafon, tenorBulan, bungaPersen, metode = 'menurun', pembulatan = 50000) {
  const plafon = Number(jumlahPlafon) || 0;
  const tenor = Number(tenorBulan) || 1;
  const rate = (Number(bungaPersen) || 0) / 100;

  // Hitung Pokok per Bulan dengan opsi pembulatan ke atas (contoh 833.333 -> 850.000)
  let pokokPerBulan = Math.ceil(plafon / tenor);
  if (pembulatan && pembulatan > 0) {
    pokokPerBulan = Math.ceil((plafon / tenor) / pembulatan) * pembulatan;
  }

  const jadwal = [];
  let sisaPokok = plafon;
  let totalBunga = 0;
  let totalPengembalian = 0;

  for (let i = 1; i <= tenor; i++) {
    if (sisaPokok <= 0) break;

    const sisaAwal = sisaPokok;
    // Bunga menurun: dihitung dari sisa saldo pokok pinjaman
    // Bunga flat: dihitung dari plafon awal
    const bungaBulanIni = metode === 'flat'
      ? Math.round(plafon * rate)
      : Math.round(sisaAwal * rate);

    // Bulan terakhir melunasi sisa pokok yang tersisa
    const pokokBulanIni = (i === tenor || sisaPokok < pokokPerBulan) ? sisaPokok : pokokPerBulan;
    const totalAngsuranBulanIni = pokokBulanIni + bungaBulanIni;
    const sisaAkhir = Math.max(0, sisaAwal - pokokBulanIni);

    jadwal.push({
      bulanKe: i,
      sisaAwal,
      pokok: pokokBulanIni,
      bunga: bungaBulanIni,
      totalAngsuran: totalAngsuranBulanIni,
      sisaAkhir
    });

    sisaPokok = sisaAkhir;
    totalBunga += bungaBulanIni;
    totalPengembalian += totalAngsuranBulanIni;
  }

  const angsuranBulanPertama = jadwal[0] ? jadwal[0].totalAngsuran : 0;
  const bungaBulanPertama = jadwal[0] ? jadwal[0].bunga : 0;
  const pokokBulanPertama = jadwal[0] ? jadwal[0].pokok : 0;

  return {
    plafon,
    tenor,
    bungaPersen,
    metode,
    pembulatan,
    pokokPerBulan: pokokBulanPertama,
    bungaBulanPertama,
    angsuranBulanPertama,
    totalBunga,
    totalPengembalian,
    jadwal
  };
}

/**
 * Menghitung Skema dan Status Angsuran Pinjaman Dinamis dengan Akumulasi Tunggakan / Kelebihan.
 * Jika pada cicilan ke-n anggota membayar kurang (misal skema Rp 1.100.000 hanya dibayar Rp 500.000),
 * sisa kekurangan (Rp 600.000) otomatis diakumulasikan dan ditambahkan ke cicilan ke-(n+1).
 * Begitu juga jika anggota membayar lebih, kelebihannya otomatis memotong tagihan cicilan berikutnya.
 */
export function hitungJadwalAkumulasiPinjaman(pinjaman) {
  if (!pinjaman) return [];

  // Ambil atau hitung jadwal skema dasar
  const baseSchedule =
    pinjaman.jadwal_angsuran && pinjaman.jadwal_angsuran.length > 0
      ? pinjaman.jadwal_angsuran
      : hitungSimulasiPinjaman(
          pinjaman.jumlah,
          pinjaman.tenor || 12,
          pinjaman.bunga || 2.5,
          pinjaman.metode_bunga || 'menurun',
          pinjaman.pembulatan !== undefined ? pinjaman.pembulatan : 50000
        ).jadwal;

  // Kelompokkan riwayat pembayaran berdasarkan angsuran_ke
  const paymentsByAngsuran = {};
  (pinjaman.riwayat_angsuran || []).forEach((p) => {
    const k = Number(p.angsuran_ke) || 1;
    if (!paymentsByAngsuran[k]) paymentsByAngsuran[k] = [];
    paymentsByAngsuran[k].push(p);
  });

  const isLoanFullyPaid = (Number(pinjaman.sisa_hutang) || 0) <= 0 && pinjaman.status === 'Lunas';

  const result = [];
  let carryOver = 0; // Positif: tunggakan dari cicilan sebelumnya; Negatif: kelebihan bayar sebelumnya

  for (let idx = 0; idx < baseSchedule.length; idx++) {
    const base = baseSchedule[idx];
    const bulanKe = base.bulanKe || idx + 1;
    const skemaAsli = Number(base.totalAngsuran) || 0;
    const pokok = Number(base.pokok) || 0;
    const bunga = Number(base.bunga) || 0;
    const sisaAwal = Number(base.sisaAwal) || 0;
    const sisaAkhir = Number(base.sisaAkhir) || 0;

    const akumulasiSebelumnya = carryOver;
    // Total kewajiban tagihan bulan ini setelah memperhitungkan akumulasi sisa/kelebihan bulan lalu
    const totalTagihan = Math.max(0, skemaAsli + akumulasiSebelumnya);

    // Ambil pembayaran yang dicatat untuk bulan ini
    const paymentsThisMonth = paymentsByAngsuran[bulanKe] || [];
    const totalDibayar = paymentsThisMonth.reduce((sum, p) => sum + (Number(p.jumlah) || 0), 0);

    let status = 'Belum';
    let sisaKurang = totalTagihan;
    let kelebihanBayar = 0;

    if (isLoanFullyPaid) {
      status = 'Lunas';
      sisaKurang = 0;
      kelebihanBayar = 0;
      carryOver = 0;
    } else if (totalDibayar > 0) {
      if (totalDibayar >= totalTagihan) {
        status = 'Lunas';
        sisaKurang = 0;
        kelebihanBayar = totalDibayar - totalTagihan;
        // Kelebihan bayar otomatis menjadi carry-over negatif (mengurangi tagihan berikutnya)
        carryOver = -kelebihanBayar;
      } else {
        status = 'Sebagian';
        sisaKurang = totalTagihan - totalDibayar;
        kelebihanBayar = 0;
        // Kekurangan bayar otomatis menjadi carry-over positif (menambah tagihan berikutnya)
        carryOver = sisaKurang;
      }
    } else {
      // Belum ada pembayaran pada bulan ini
      status = 'Belum';
      sisaKurang = totalTagihan;
      kelebihanBayar = 0;
      // CarryOver sudah dialokasikan ke totalTagihan bulan ini; reset carryOver untuk bulan-bulan setelahnya
      carryOver = 0;
    }

    result.push({
      bulanKe,
      sisaAwal,
      pokok,
      bunga,
      skemaAsli,
      akumulasiSebelumnya,
      totalTagihan,
      totalDibayar,
      sisaKurang,
      kelebihanBayar,
      status,
      payments: paymentsThisMonth
    });
  }

  return result;
}
