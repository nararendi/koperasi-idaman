'use client';

import { useState, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import RupiahInput from '../../components/RupiahInput';
import { dataService } from '../../lib/dataService';
import { excelExport } from '../../lib/excelExport';
import { pdfExport } from '../../lib/pdfExport';
import { formatRupiah, formatNominal } from '../../lib/formatters';

export default function UsahaPage() {
  const [activeTab, setActiveTab] = useState('sembako'); // 'sembako' | 'qurban' | 'rekap'

  // Data states
  const [produkList, setProdukList] = useState([]);
  const [transaksiSembakoList, setTransaksiSembakoList] = useState([]);
  const [pesertaQurbanList, setPesertaQurbanList] = useState([]);
  const [mutasiQurbanList, setMutasiQurbanList] = useState([]);
  const [anggotaList, setAnggotaList] = useState([]);
  const [settings, setSettings] = useState({});
  const [summary, setSummary] = useState({
    sembako: { totalOmzet: 0, totalTransaksi: 0, totalProduk: 0 },
    qurban: { totalTerkumpul: 0, pesertaAktif: 0, pesertaTersalurkan: 0, totalPeserta: 0 }
  });

  // Modal states
  const [modalProdukOpen, setModalProdukOpen] = useState(false);
  const [editingProduk, setEditingProduk] = useState(null);
  const [produkForm, setProdukForm] = useState({
    nama: '',
    kategori: 'Beras',
    satuan: 'Kg',
    harga_beli: '',
    harga_jual: '',
    stok: ''
  });

  const [modalKasirOpen, setModalKasirOpen] = useState(false);
  const [cart, setCart] = useState([]);
  const [kasirForm, setKasirForm] = useState({
    tipePembeli: 'Anggota', // 'Anggota' | 'Umum'
    anggotaId: '',
    namaPembeli: '',
    bayar: '',
    metode: 'Tunai'
  });

  const [modalPesertaQurbanOpen, setModalPesertaQurbanOpen] = useState(false);
  const [pesertaQurbanForm, setPesertaQurbanForm] = useState({
    tipePeserta: 'Anggota',
    anggotaId: '',
    nama: '',
    tipe_hewan: '1 Ekor Kambing / Domba',
    target_nominal: 3500000,
    tahun_qurban: '1448 H / 2026'
  });

  const [modalSetorQurbanOpen, setModalSetorQurbanOpen] = useState(false);
  const [selectedPesertaQurban, setSelectedPesertaQurban] = useState(null);
  const [setorQurbanForm, setSetorQurbanForm] = useState({
    peserta_id: '',
    jumlah: '',
    metode: 'Tunai',
    keterangan: 'Setoran Tabungan Qurban'
  });

  const [modalSalurQurbanOpen, setModalSalurQurbanOpen] = useState(false);
  const [salurQurbanForm, setSalurQurbanForm] = useState({
    peserta_id: '',
    keterangan: 'Pembelian & Penyaluran Hewan Qurban'
  });

  const [modalNotaOpen, setModalNotaOpen] = useState(false);
  const [notaData, setNotaData] = useState(null);

  const loadData = () => {
    setProdukList(dataService.getSembakoProdukList());
    setTransaksiSembakoList(dataService.getSembakoTransaksiList());
    setPesertaQurbanList(dataService.getQurbanPesertaList());
    setMutasiQurbanList(dataService.getQurbanMutasiList());
    setAnggotaList(dataService.getAnggotaList());
    setSettings(dataService.getSettings());
    setSummary(dataService.getUsahaSummary());
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('koperasi_db_updated', handleUpdate);
    return () => window.removeEventListener('koperasi_db_updated', handleUpdate);
  }, []);


  // ==================== SEMBAKO HANDLERS ====================
  const handleOpenTambahProduk = () => {
    setEditingProduk(null);
    setProdukForm({
      nama: '',
      kategori: 'Beras',
      satuan: 'Kg',
      harga_beli: '',
      harga_jual: '',
      stok: ''
    });
    setModalProdukOpen(true);
  };

  const handleOpenEditProduk = (prod) => {
    setEditingProduk(prod);
    setProdukForm({
      nama: prod.nama,
      kategori: prod.kategori || 'Umum',
      satuan: prod.satuan || 'Pcs',
      harga_beli: prod.harga_beli || '',
      harga_jual: prod.harga_jual || '',
      stok: prod.stok || ''
    });
    setModalProdukOpen(true);
  };

  const handleSaveProduk = (e) => {
    e.preventDefault();
    if (!produkForm.nama.trim()) return alert('Nama produk wajib diisi!');

    if (editingProduk) {
      dataService.updateSembakoProduk(editingProduk.id, produkForm);
    } else {
      dataService.addSembakoProduk(produkForm);
    }
    setModalProdukOpen(false);
    loadData();
  };

  const handleDeleteProduk = (id, nama) => {
    if (confirm(`Hapus produk "${nama}" dari katalog sembako?`)) {
      dataService.deleteSembakoProduk(id);
      loadData();
    }
  };

  // Kasir POS Handlers
  const handleOpenKasir = () => {
    setCart([]);
    setKasirForm({
      tipePembeli: 'Anggota',
      anggotaId: anggotaList[0]?.id || '',
      namaPembeli: anggotaList[0]?.nama_lengkap || anggotaList[0]?.nama || '',
      bayar: '',
      metode: 'Tunai'
    });
    setModalKasirOpen(true);
  };

  const handleAddToCart = (prod) => {
    if (prod.stok <= 0) return alert('Stok produk ini sedang kosong!');
    const existing = cart.find((c) => c.id === prod.id);
    if (existing) {
      if (existing.qty + 1 > prod.stok) return alert(`Stok maksimal tersedia hanya ${prod.stok}`);
      setCart(cart.map((c) => (c.id === prod.id ? { ...c, qty: c.qty + 1 } : c)));
    } else {
      setCart([...cart, { ...prod, qty: 1 }]);
    }
  };

  const handleUpdateCartQty = (id, newQty) => {
    const prod = produkList.find((p) => p.id === id);
    if (newQty <= 0) {
      setCart(cart.filter((c) => c.id !== id));
    } else if (prod && newQty > prod.stok) {
      alert(`Stok maksimal hanya ${prod.stok}`);
    } else {
      setCart(cart.map((c) => (c.id === id ? { ...c, qty: newQty } : c)));
    }
  };

  const cartTotal = cart.reduce((acc, item) => acc + (Number(item.harga_jual) || 0) * (Number(item.qty) || 1), 0);
  const kembalian = Math.max(0, (Number(kasirForm.bayar) || 0) - cartTotal);

  const handleSubmitTransaksiKasir = (e) => {
    e.preventDefault();
    if (cart.length === 0) return alert('Keranjang belanja masih kosong!');
    const bayarNominal = Number(kasirForm.bayar) || 0;
    if (bayarNominal < cartTotal) return alert(`Uang pembayaran kurang ${formatRupiah(cartTotal - bayarNominal)}`);

    let namaPembeliFinal = kasirForm.namaPembeli;
    let nomorAnggotaFinal = '-';

    if (kasirForm.tipePembeli === 'Anggota') {
      const a = (anggotaList || []).find((x) => x && (x.id === kasirForm.anggotaId || x.nomor_anggota === kasirForm.anggotaId));
      if (a) {
        namaPembeliFinal = a.nama_lengkap || a.nama || 'Anggota';
        nomorAnggotaFinal = a.nomor_anggota || a.id || '-';
      }
    }

    const tx = dataService.addSembakoTransaksi({
      pembeli: namaPembeliFinal || 'Pelanggan Umum',
      nomor_anggota: nomorAnggotaFinal,
      items: cart,
      total: cartTotal,
      bayar: bayarNominal,
      kembali: kembalian,
      metode: kasirForm.metode
    });

    setModalKasirOpen(false);
    loadData();
    setNotaData({ ...tx, tipe: 'sembako' });
    setModalNotaOpen(true);
  };

  // ==================== QURBAN HANDLERS ====================
  const handleOpenDaftarQurban = () => {
    setPesertaQurbanForm({
      tipePeserta: 'Anggota',
      anggotaId: anggotaList[0]?.id || '',
      nama: anggotaList[0]?.nama_lengkap || anggotaList[0]?.nama || '',
      tipe_hewan: '1 Ekor Kambing / Domba',
      target_nominal: 3500000,
      tahun_qurban: '1448 H / 2026'
    });
    setModalPesertaQurbanOpen(true);
  };

  const handleSavePesertaQurban = (e) => {
    e.preventDefault();
    let namaFinal = pesertaQurbanForm.nama;
    let noAnggotaFinal = '-';

    if (pesertaQurbanForm.tipePeserta === 'Anggota') {
      const a = (anggotaList || []).find((x) => x && (x.id === pesertaQurbanForm.anggotaId || x.nomor_anggota === pesertaQurbanForm.anggotaId));
      if (a) {
        namaFinal = a.nama_lengkap || a.nama || 'Anggota';
        noAnggotaFinal = a.nomor_anggota || a.id || '-';
      }
    }

    if (!namaFinal.trim()) return alert('Nama peserta Qurban wajib diisi!');

    dataService.addQurbanPeserta({
      nama: namaFinal,
      nomor_anggota: noAnggotaFinal,
      tipe_hewan: pesertaQurbanForm.tipe_hewan,
      target_nominal: Number(pesertaQurbanForm.target_nominal),
      tahun_qurban: pesertaQurbanForm.tahun_qurban
    });

    setModalPesertaQurbanOpen(false);
    loadData();
  };

  const handleOpenSetorQurban = (peserta = null) => {
    const target = peserta || pesertaQurbanList[0];
    if (!target) return alert('Belum ada peserta Qurban yang terdaftar!');
    setSelectedPesertaQurban(target);
    setSetorQurbanForm({
      peserta_id: target.id,
      jumlah: '',
      metode: 'Tunai',
      keterangan: 'Setoran Tabungan Qurban'
    });
    setModalSetorQurbanOpen(true);
  };

  const handleSaveSetorQurban = (e) => {
    e.preventDefault();
    if (!setorQurbanForm.jumlah || Number(setorQurbanForm.jumlah) <= 0) {
      return alert('Masukkan nominal setoran yang valid!');
    }

    const mutasi = dataService.setorTabunganQurban(setorQurbanForm);
    setModalSetorQurbanOpen(false);
    loadData();
    setNotaData({ ...mutasi, tipe: 'qurban_setoran' });
    setModalNotaOpen(true);
  };

  const handleOpenSalurQurban = (peserta) => {
    setSelectedPesertaQurban(peserta);
    setSalurQurbanForm({
      peserta_id: peserta.id,
      keterangan: `Pembelian & Penyerahan Hewan Qurban (${peserta.tipe_hewan})`
    });
    setModalSalurQurbanOpen(true);
  };

  const handleSaveSalurQurban = (e) => {
    e.preventDefault();
    if (!selectedPesertaQurban) return;
    if (confirm(`Konfirmasi penyaluran dana qurban sebesar ${formatRupiah(selectedPesertaQurban?.total_terkumpul || 0)} untuk ${selectedPesertaQurban?.nama || 'Peserta'}? Dana kas akan dicatat keluar.`)) {
      dataService.salurkanQurban(salurQurbanForm);
      setModalSalurQurbanOpen(false);
      loadData();
      alert('Penyaluran dana Qurban berhasil dicatat!');
    }
  };

  const printNotaContent = () => {
    window.print();
  };

  return (
    <AppLayout
      title="Unit Usaha Sembako & Tabungan Qurban"
      subtitle="Pengelolaan penjualan sembako toko koperasi dan program titipan tabungan qurban berjangka."
    >
      {/* Header Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-200/80 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('sembako')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'sembako'
              ? 'bg-[#2563eb] text-white shadow-md shadow-[#2563eb]/25'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
          <span>Toko Sembako Koperasi</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${activeTab === 'sembako' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {produkList.length} Produk
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('qurban')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'qurban'
              ? 'bg-[#2563eb] text-white shadow-md shadow-[#2563eb]/25'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">volunteer_activism</span>
          <span>Program Tabungan Qurban</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${activeTab === 'qurban' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {summary.qurban.pesertaAktif} Aktif
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rekap')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'rekap'
              ? 'bg-[#2563eb] text-white shadow-md shadow-[#2563eb]/25'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">monitoring</span>
          <span>Rekapitulasi Unit Usaha</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TOKO SEMBAKO KOPERASI */}
      {/* ========================================================================= */}
      {activeTab === 'sembako' && (
        <div className="space-y-6">
          {/* Sembako Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2563eb] flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">point_of_sale</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 block uppercase">Total Omzet Penjualan</span>
                <span className="text-lg font-black text-[#0f172a]">{formatRupiah(summary.sembako.totalOmzet)}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">receipt</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 block uppercase">Total Transaksi Kasir</span>
                <span className="text-lg font-black text-[#0f172a]">{summary.sembako.totalTransaksi} Nota</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">inventory_2</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 block uppercase">Produk Sembako Aktif</span>
                <span className="text-lg font-black text-[#0f172a]">{produkList.length} Item</span>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-100 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#2563eb]">store</span>
              <span className="text-xs font-black text-[#0f172a]">Katalog & Transaksi Sembako</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenTambahProduk}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">add_circle</span>
                Tambah Produk
              </button>
              <button
                type="button"
                onClick={handleOpenKasir}
                className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-5 py-2 rounded-full text-xs font-extrabold flex items-center gap-2 transition-all shadow-md shadow-[#2563eb]/20 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">point_of_sale</span>
                Transaksi Kasir (POS)
              </button>
            </div>
          </div>

          {/* Grid: Katalog Barang & Riwayat Penjualan */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Katalog Barang (2 Cols) */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#2563eb]">inventory</span>
                  <h3 className="text-xs font-black text-[#0f172a] uppercase">Daftar Stok Sembako</h3>
                </div>
                <span className="text-[11px] text-slate-400 font-semibold">{produkList.length} Item terdaftar</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold">
                      <th className="py-2.5 px-3">Kode & Produk</th>
                      <th className="py-2.5 px-3">Kategori</th>
                      <th className="py-2.5 px-3 text-right">Harga Beli</th>
                      <th className="py-2.5 px-3 text-right">Harga Jual</th>
                      <th className="py-2.5 px-3 text-center">Stok</th>
                      <th className="py-2.5 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {produkList.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3">
                          <span className="font-mono text-[10px] text-slate-400 block">{p.id}</span>
                          <span className="font-bold text-[#0f172a]">{p.nama}</span>
                          <span className="text-[10px] text-slate-500 block">Satuan: {p.satuan}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-bold">
                            {p.kategori}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-slate-500">{formatRupiah(p.harga_beli)}</td>
                        <td className="py-3 px-3 text-right font-bold text-[#2563eb]">{formatRupiah(p.harga_jual)}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${p.stok <= 5 ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-emerald-50 text-emerald-600'}`}>\
                            {p.stok} {p.satuan}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditProduk(p)}
                              title="Edit Produk"
                              className="p-1.5 hover:bg-blue-50 text-[#2563eb] rounded-lg transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduk(p.id, p.nama)}
                              title="Hapus Produk"
                              className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Riwayat Penjualan Kasir (1 Col) */}
            <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#2563eb]">receipt_long</span>
                    <h3 className="text-xs font-black text-[#0f172a] uppercase">Riwayat Nota Penjualan</h3>
                  </div>
                  <span className="text-[11px] text-slate-400 font-semibold">{transaksiSembakoList.length} Nota</span>
                </div>

                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                  {transaksiSembakoList.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">Belum ada transaksi penjualan sembako.</div>
                  ) : (
                    transaksiSembakoList.map((tx) => (
                      <div key={tx.id} className="p-3 bg-[#f8fafc] rounded-2xl border border-slate-100 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold text-[#2563eb]">{tx.id}</span>
                          <span className="text-[10px] text-slate-400">{tx.tanggal}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800">{tx.pembeli}</span>
                          <span className="font-extrabold text-[#2563eb]">{formatRupiah(tx.total)}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 border-t border-slate-200/50 pt-1 flex justify-between items-center">
                          <span>{tx.items?.length || 0} Item ({tx.metode})</span>
                          <button
                            type="button"
                            onClick={() => {
                              setNotaData({ ...tx, tipe: 'sembako' });
                              setModalNotaOpen(true);
                            }}
                            className="text-[#2563eb] font-bold hover:underline"
                          >
                            Lihat Nota
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TABUNGAN QURBAN */}
      {/* ========================================================================= */}
      {activeTab === 'qurban' && (
        <div className="space-y-6">
          {/* Qurban Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 block uppercase">Total Dana Titipan Terkumpul</span>
                <span className="text-lg font-black text-emerald-600">{formatRupiah(summary.qurban.totalTerkumpul)}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2563eb] flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">groups</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 block uppercase">Peserta Menabung Aktif</span>
                <span className="text-lg font-black text-[#0f172a]">{summary.qurban.pesertaAktif} Orang</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">verified</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 block uppercase">Hewan Tersalurkan</span>
                <span className="text-lg font-black text-[#0f172a]">{summary.qurban.pesertaTersalurkan} Ekor / Paket</span>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-100 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#2563eb]">savings</span>
              <span className="text-xs font-black text-[#0f172a]">Program Tabungan Qurban Koperasi</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenDaftarQurban}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">person_add</span>
                Daftar Peserta Qurban
              </button>
              <button
                type="button"
                onClick={() => handleOpenSetorQurban()}
                className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-5 py-2 rounded-full text-xs font-extrabold flex items-center gap-2 transition-all shadow-md shadow-[#2563eb]/20 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">payments</span>
                Setor Tabungan Qurban
              </button>
            </div>
          </div>

          {/* Cards Progres Tabungan Qurban per Anggota */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {pesertaQurbanList.length === 0 ? (
              <div className="col-span-full bg-white rounded-3xl p-10 text-center border border-slate-100 text-slate-400 text-xs">
                Belum ada peserta tabungan Qurban yang didaftarkan.
              </div>
            ) : (
              pesertaQurbanList.map((peserta) => {
                const target = Number(peserta.target_nominal) || 1;
                const terkumpul = Number(peserta.total_terkumpul) || 0;
                const persen = Math.min(100, Math.round((terkumpul / target) * 100));

                let statusBadge = 'bg-blue-50 text-[#2563eb] border-blue-200';
                if (peserta.status === 'Tercapai') statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                if (peserta.status === 'Tersalurkan') statusBadge = 'bg-purple-50 text-purple-700 border-purple-200';

                return (
                  <div key={peserta.id} className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs flex flex-col justify-between hover:border-[#bfdbfe] transition-all">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono text-slate-400 font-bold">{peserta.id} &bull; {peserta.nomor_anggota}</span>
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${statusBadge}`}>
                          {peserta.status}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-sm text-[#0f172a]">{peserta.nama}</h4>
                      <p className="text-xs text-slate-500 font-medium mb-3">{peserta.tipe_hewan} ({peserta.tahun_qurban})</p>

                      {/* Progress Bar */}
                      <div className="space-y-1 mb-4">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-500">Terkumpul: <strong className="text-[#0f172a]">{formatRupiah(terkumpul)}</strong></span>
                          <span className="font-bold text-[#2563eb]">{persen}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className={`h-2.5 rounded-full transition-all duration-500 ${
                              persen >= 100 ? 'bg-emerald-500' : 'bg-[#2563eb]'
                            }`}
                            style={{ width: `${persen}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
                          <span>Target: {formatRupiah(target)}</span>
                          <span>Sisa: {formatRupiah(Math.max(0, target - terkumpul))}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                      {peserta.status !== 'Tersalurkan' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenSetorQurban(peserta)}
                            className="flex-1 py-1.5 bg-[#eff6ff] hover:bg-[#dbeafe] text-[#2563eb] text-xs font-bold rounded-xl transition-colors"
                          >
                            + Setor
                          </button>
                          {peserta.status === 'Tercapai' && (
                            <button
                              type="button"
                              onClick={() => handleOpenSalurQurban(peserta)}
                              className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
                            >
                              Salurkan
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="text-[11px] text-purple-600 font-bold text-center w-full py-1">
                          ✓ Hewan Telah Disalurkan
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Riwayat Mutasi Qurban */}
          <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2563eb]">history_edu</span>
                <h3 className="text-xs font-black text-[#0f172a] uppercase">Riwayat Mutasi Setoran & Penyaluran Qurban</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-semibold">{mutasiQurbanList.length} Transaksi</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold">
                    <th className="py-2.5 px-3">Kode & Tanggal</th>
                    <th className="py-2.5 px-3">Nama Peserta</th>
                    <th className="py-2.5 px-3">Tipe</th>
                    <th className="py-2.5 px-3 text-right">Jumlah (Rp)</th>
                    <th className="py-2.5 px-3">Metode / Keterangan</th>
                    <th className="py-2.5 px-3 text-center">Bukti</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {mutasiQurbanList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">Belum ada mutasi tabungan qurban.</td>
                    </tr>
                  ) : (
                    mutasiQurbanList.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3">
                          <span className="font-mono text-[10px] text-slate-400 block">{m.id}</span>
                          <span className="font-bold text-slate-800">{m.tanggal}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-[#0f172a]">{m.nama_peserta}</span>
                          <span className="text-[10px] text-slate-400 block">{m.nomor_anggota}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${m.tipe === 'Setoran' ? 'bg-emerald-50 text-emerald-600' : 'bg-purple-50 text-purple-600'}`}>
                            {m.tipe}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-extrabold text-[#0f172a]">{formatRupiah(m.jumlah)}</td>
                        <td className="py-3 px-3 text-slate-600">
                          <span>{m.keterangan || '-'}</span>
                          <span className="text-[10px] text-slate-400 block">Metode: {m.metode || 'Tunai'}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setNotaData({ ...m, tipe: 'qurban_setoran' });
                              setModalNotaOpen(true);
                            }}
                            className="p-1 text-[#2563eb] hover:bg-blue-50 rounded-lg transition-colors"
                            title="Cetak Bukti Kuitansi"
                          >
                            <span className="material-symbols-outlined text-base">receipt</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: REKAPITULASI LAPORAN UNIT USAHA & QURBAN */}
      {/* ========================================================================= */}
      {activeTab === 'rekap' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs">
            <div className="text-center pb-4 border-b border-slate-100 mb-6">
              <h2 className="text-lg font-black text-[#0f172a] tracking-wide">{settings.namaKoperasi || 'KOPERASI IDAMAN'}</h2>
              <p className="text-xs text-slate-500">{settings.alamat || 'Jl. Situtarate - Cibaduyut'} {settings.telepon ? `• Telp: ${settings.telepon}` : ''}</p>
              <div className="inline-flex items-center gap-1.5 bg-[#eff6ff] border border-[#2563eb]/20 px-4 py-1.5 rounded-full text-xs font-bold text-[#2563eb] mt-2 shadow-2xs">
                <span className="material-symbols-outlined text-sm">analytics</span>
                <span>Rekapitulasi Unit Usaha Sembako & Program Qurban</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Rekap Sembako */}
              <div className="bg-[#f8fafc] p-5 rounded-2xl border border-slate-200/70 space-y-3 text-xs">
                <div className="flex items-center gap-2 text-[#2563eb] font-extrabold pb-2 border-b border-slate-200">
                  <span className="material-symbols-outlined">storefront</span>
                  <span>Ringkasan Usaha Toko Sembako</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Omzet Penjualan Sembako:</span>
                  <span className="font-bold text-[#0f172a]">{formatRupiah(summary.sembako.totalOmzet)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Transaksi Nota Kasir:</span>
                  <span className="font-bold text-[#0f172a]">{summary.sembako.totalTransaksi} Transaksi</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Jumlah Jenis Barang / Stok:</span>
                  <span className="font-bold text-[#0f172a]">{summary.sembako.totalProduk} Produk</span>
                </div>
                <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                  * Seluruh penerimaan penjualan sembako telah terintegrasi langsung ke Buku Kas Harian Koperasi.
                </div>
              </div>

              {/* Rekap Qurban */}
              <div className="bg-[#f8fafc] p-5 rounded-2xl border border-slate-200/70 space-y-3 text-xs">
                <div className="flex items-center gap-2 text-emerald-600 font-extrabold pb-2 border-b border-slate-200">
                  <span className="material-symbols-outlined">volunteer_activism</span>
                  <span>Ringkasan Program Tabungan Qurban</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Saldo Titipan Dana Qurban:</span>
                  <span className="font-extrabold text-emerald-600">{formatRupiah(summary.qurban.totalTerkumpul)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Jumlah Peserta Qurban Terdaftar:</span>
                  <span className="font-bold text-[#0f172a]">{summary.qurban.totalPeserta} Orang</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Peserta Aktif Menabung:</span>
                  <span className="font-bold text-[#0f172a]">{summary.qurban.pesertaAktif} Orang</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Hewan Qurban Tersalurkan:</span>
                  <span className="font-bold text-purple-600">{summary.qurban.pesertaTersalurkan} Ekor</span>
                </div>
                <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                  * Dana tabungan qurban bersifat kondisional/titipan dan dipisahkan dari simpanan pokok/wajib anggota.
                </div>
              </div>
            </div>

            {/* Tanda Tangan */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-xs text-center gap-6">
              <div className="w-64">
                <span className="text-slate-500 font-semibold mb-1 block">Mengetahui,</span>
                <span className="font-extrabold text-[#0f172a] text-sm">Ketua Pengurus</span>
                <div className="h-16"></div>
                <span className="font-extrabold text-[#0f172a] text-sm border-b border-slate-800 pb-0.5 min-w-36 block">
                  {settings.ketua || '-'}
                </span>
              </div>

              <div className="w-64">
                <span className="text-slate-500 font-semibold mb-1 block">
                  {settings.alamat ? `${settings.alamat.split(',').pop().trim()}, ` : ''}{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                <span className="font-extrabold text-[#0f172a] text-sm">Bendahara</span>
                <div className="h-16"></div>
                <span className="font-extrabold text-[#0f172a] text-sm border-b border-slate-800 pb-0.5 min-w-36 block">
                  {settings.bendahara || '-'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH / EDIT PRODUK SEMBAKO */}
      {/* ========================================================================= */}
      {modalProdukOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/40 flex items-center justify-center p-4 sm:p-6 md:pl-64 lg:pl-68 overflow-y-auto animate-fade-in">
          <div className="bg-white w-full max-w-md max-h-[88vh] my-auto rounded-[28px] sm:rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-pop-in">
            <div className="p-5 bg-[#f8fafc] border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2563eb]">inventory_2</span>
                <h3 className="font-extrabold text-sm text-[#0f172a]">
                  {editingProduk ? 'Edit Produk Sembako' : 'Tambah Produk Sembako Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalProdukOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveProduk} className="p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Produk Sembako *</label>
                <input
                  type="text"
                  required
                  value={produkForm.nama}
                  onChange={(e) => setProdukForm({ ...produkForm, nama: e.target.value })}
                  placeholder="Contoh: Beras Ramos 5 Kg"
                  className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] outline-none font-semibold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kategori</label>
                  <select
                    value={produkForm.kategori}
                    onChange={(e) => setProdukForm({ ...produkForm, kategori: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] outline-none font-semibold text-slate-800"
                  >
                    <option value="Beras">Beras</option>
                    <option value="Minyak">Minyak Goreng</option>
                    <option value="Gula">Gula Pasir</option>
                    <option value="Tepung">Tepung</option>
                    <option value="Telur">Telur</option>
                    <option value="Kebutuhan Pokok">Kebutuhan Pokok</option>
                    <option value="Lain-Lain">Lain-Lain</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Satuan</label>
                  <input
                    type="text"
                    required
                    value={produkForm.satuan}
                    onChange={(e) => setProdukForm({ ...produkForm, satuan: e.target.value })}
                    placeholder="Kg, Liter, Pcs, Dus"
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] outline-none font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Harga Beli / Kulakan (Rp)</label>
                  <RupiahInput
                    value={produkForm.harga_beli}
                    onChange={(val) => setProdukForm({ ...produkForm, harga_beli: val })}
                    placeholder="0"
                    className="!rounded-2xl !bg-[#f8fafc]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Harga Jual Konsumen (Rp) *</label>
                  <RupiahInput
                    required
                    value={produkForm.harga_jual}
                    onChange={(val) => setProdukForm({ ...produkForm, harga_jual: val })}
                    placeholder="0"
                    className="!rounded-2xl !bg-[#f8fafc] font-black text-[#2563eb]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Jumlah Stok Masuk / Awal</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={produkForm.stok}
                  onChange={(e) => setProdukForm({ ...produkForm, stok: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl focus:border-[#2563eb] outline-none font-bold text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalProdukOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-2xl font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-2xl font-extrabold transition-all shadow-md shadow-[#2563eb]/20 cursor-pointer"
                >
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TRANSAKSI KASIR (POS) SEMBAKO */}
      {/* ========================================================================= */}
      {modalKasirOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/40 flex items-center justify-center p-4 sm:p-6 md:pl-64 lg:pl-68 overflow-y-auto animate-fade-in">
          <div className="bg-white w-full max-w-4xl max-h-[88vh] my-auto rounded-[28px] sm:rounded-[32px] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-pop-in">
            <div className="p-5 bg-[#f8fafc] border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2563eb]">point_of_sale</span>
                <h3 className="font-extrabold text-sm text-[#0f172a]">Kasir Transaksi Sembako (POS)</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalKasirOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
              {/* Kolom Kiri: Pilihan Produk (7 Cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Pilih Barang Sembako</span>
                  <span className="text-[11px] text-slate-400">Klik item untuk masukkan ke keranjang</span>
                </div>

                <div className="grid grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                  {produkList.map((prod) => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => handleAddToCart(prod)}
                      className="p-3 bg-[#f8fafc] hover:bg-[#eff6ff] hover:border-[#bfdbfe] border border-slate-200 rounded-2xl text-left transition-all flex flex-col justify-between group cursor-pointer"
                    >
                      <div>
                        <span className="font-mono text-[9px] text-slate-400 block">{prod.kategori}</span>
                        <h4 className="font-extrabold text-xs text-[#0f172a] group-hover:text-[#2563eb] transition-colors">{prod.nama}</h4>
                      </div>
                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-200/50">
                        <span className="font-black text-[#2563eb]">{formatRupiah(prod.harga_jual)}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${prod.stok > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                          Stok: {prod.stok}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Kolom Kanan: Keranjang & Pembayaran (5 Cols) */}
              <div className="lg:col-span-5 bg-[#f8fafc] p-4 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-4">
                <div>
                  <h4 className="font-extrabold text-xs text-[#0f172a] mb-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[#2563eb] text-sm">shopping_basket</span>
                    Keranjang Belanja
                  </h4>

                  {/* Keranjang List */}
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {cart.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 text-[11px]">Keranjang belanja masih kosong.</div>
                    ) : (
                      cart.map((item) => (
                        <div key={item.id} className="p-2 bg-white rounded-xl border border-slate-100 flex items-center justify-between text-[11px]">
                          <div className="flex-1 pr-2">
                            <span className="font-bold text-slate-800 block truncate">{item.nama}</span>
                            <span className="text-slate-400">{formatRupiah(item.harga_jual)} x {item.qty}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateCartQty(item.id, item.qty - 1)}
                              className="w-5 h-5 rounded-md bg-slate-100 hover:bg-slate-200 font-bold flex items-center justify-center"
                            >
                              -
                            </button>
                            <span className="font-bold min-w-4 text-center">{item.qty}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateCartQty(item.id, item.qty + 1)}
                              className="w-5 h-5 rounded-md bg-slate-100 hover:bg-slate-200 font-bold flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Form Pembeli & Bayar */}
                <form onSubmit={handleSubmitTransaksiKasir} className="space-y-3 pt-3 border-t border-slate-200">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Tipe Pembeli</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setKasirForm({ ...kasirForm, tipePembeli: 'Anggota' })}
                        className={`py-1.5 rounded-xl font-bold text-[11px] ${kasirForm.tipePembeli === 'Anggota' ? 'bg-[#2563eb] text-white' : 'bg-white border border-slate-200 text-slate-700'}`}
                      >
                        Anggota
                      </button>
                      <button
                        type="button"
                        onClick={() => setKasirForm({ ...kasirForm, tipePembeli: 'Umum' })}
                        className={`py-1.5 rounded-xl font-bold text-[11px] ${kasirForm.tipePembeli === 'Umum' ? 'bg-[#2563eb] text-white' : 'bg-white border border-slate-200 text-slate-700'}`}
                      >
                        Umum
                      </button>
                    </div>
                  </div>

                  {kasirForm.tipePembeli === 'Anggota' ? (
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Pilih Anggota</label>
                      <select
                        value={kasirForm.anggotaId}
                        onChange={(e) => setKasirForm({ ...kasirForm, anggotaId: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none font-semibold"
                      >
                        {anggotaList.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.nomor_anggota || a.id} - {a.nama_lengkap || a.nama}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Nama Pembeli Umum</label>
                      <input
                        type="text"
                        value={kasirForm.namaPembeli}
                        onChange={(e) => setKasirForm({ ...kasirForm, namaPembeli: e.target.value })}
                        placeholder="Pelanggan Umum"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none font-semibold"
                      />
                    </div>
                  )}

                  {/* Total & Bayar */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-600">Total Tagihan:</span>
                      <span className="text-base font-black text-[#2563eb]">{formatRupiah(cartTotal)}</span>
                    </div>
                    <div className="flex justify-between items-center gap-2 text-xs">
                      <label className="font-bold text-slate-700 whitespace-nowrap">Uang Bayar:</label>
                      <div className="w-36">
                        <RupiahInput
                          required
                          value={kasirForm.bayar}
                          onChange={(val) => setKasirForm({ ...kasirForm, bayar: val })}
                          placeholder="0"
                          className="!rounded-xl !bg-[#f8fafc] text-right font-extrabold text-slate-800"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-100">
                      <span className="text-slate-500">Kembalian:</span>
                      <span className="font-bold text-emerald-600">{formatRupiah(kembalian)}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={cart.length === 0}
                    className="w-full py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-50 text-white rounded-2xl font-extrabold text-xs transition-all shadow-md shadow-[#2563eb]/20 cursor-pointer"
                  >
                    Selesaikan Transaksi & Cetak Nota
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DAFTAR PESERTA QURBAN BARU */}
      {/* ========================================================================= */}
      {modalPesertaQurbanOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/40 flex items-center justify-center p-4 sm:p-6 md:pl-64 lg:pl-68 overflow-y-auto animate-fade-in">
          <div className="bg-white w-full max-w-md max-h-[88vh] my-auto rounded-[28px] sm:rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-pop-in">
            <div className="p-5 bg-[#f8fafc] border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2563eb]">person_add</span>
                <h3 className="font-extrabold text-sm text-[#0f172a]">Daftar Peserta Tabungan Qurban</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalPesertaQurbanOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSavePesertaQurban} className="p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Status Keanggotaan</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPesertaQurbanForm({ ...pesertaQurbanForm, tipePeserta: 'Anggota' })}
                    className={`py-2 rounded-xl font-bold ${pesertaQurbanForm.tipePeserta === 'Anggota' ? 'bg-[#2563eb] text-white' : 'bg-[#f8fafc] text-slate-700 border border-slate-200'}`}
                  >
                    Anggota Koperasi
                  </button>
                  <button
                    type="button"
                    onClick={() => setPesertaQurbanForm({ ...pesertaQurbanForm, tipePeserta: 'Umum' })}
                    className={`py-2 rounded-xl font-bold ${pesertaQurbanForm.tipePeserta === 'Umum' ? 'bg-[#2563eb] text-white' : 'bg-[#f8fafc] text-slate-700 border border-slate-200'}`}
                  >
                    Non-Anggota / Umum
                  </button>
                </div>
              </div>

              {pesertaQurbanForm.tipePeserta === 'Anggota' ? (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pilih Anggota *</label>
                  <select
                    value={pesertaQurbanForm.anggotaId}
                    onChange={(e) => setPesertaQurbanForm({ ...pesertaQurbanForm, anggotaId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl font-semibold outline-none"
                  >
                    {anggotaList.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nomor_anggota || a.id} - {a.nama_lengkap || a.nama}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nama Lengkap Peserta *</label>
                  <input
                    type="text"
                    required
                    value={pesertaQurbanForm.namaManual}
                    onChange={(e) => setPesertaQurbanForm({ ...pesertaQurbanForm, namaManual: e.target.value })}
                    placeholder="Nama Lengkap"
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl font-semibold outline-none"
                  />
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Pilihan Hewan Qurban</label>
                <select
                  value={pesertaQurbanForm.tipeHewan}
                  onChange={(e) => setPesertaQurbanForm({ ...pesertaQurbanForm, tipeHewan: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl font-semibold outline-none"
                >
                  <option value="Sapi (1 Ekor Penuh)">Sapi (1 Ekor Penuh)</option>
                  <option value="Sapi (1/7 Bagian Kolektif)">Sapi (1/7 Bagian Kolektif)</option>
                  <option value="Kambing / Domba">Kambing / Domba</option>
                  <option value="Titip Dana Qurban Bebas">Titip Dana Qurban Bebas</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Target Nominal Tabungan (Rp) *</label>
                <RupiahInput
                  required
                  value={pesertaQurbanForm.targetNominal}
                  onChange={(val) => setPesertaQurbanForm({ ...pesertaQurbanForm, targetNominal: val })}
                  placeholder="0"
                  className="!rounded-2xl !bg-[#f8fafc] font-black text-[#2563eb]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Target Periode Qurban</label>
                  <input
                    type="text"
                    value={pesertaQurbanForm.periode}
                    onChange={(e) => setPesertaQurbanForm({ ...pesertaQurbanForm, periode: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl font-semibold outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nomor HP / WA</label>
                  <input
                    type="text"
                    value={pesertaQurbanForm.kontak}
                    onChange={(e) => setPesertaQurbanForm({ ...pesertaQurbanForm, kontak: e.target.value })}
                    placeholder="08xxxxxxxx"
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl font-semibold outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalPesertaQurbanOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-2xl font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-2xl font-extrabold transition-all shadow-md shadow-[#2563eb]/20 cursor-pointer"
                >
                  Daftarkan Peserta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SETOR TABUNGAN QURBAN */}
      {/* ========================================================================= */}
      {modalSetorQurbanOpen && selectedPesertaQurban && (
        <div className="fixed inset-0 z-[100] bg-slate-950/40 flex items-center justify-center p-4 sm:p-6 md:pl-64 lg:pl-68 overflow-y-auto animate-fade-in">
          <div className="bg-white w-full max-w-md max-h-[88vh] my-auto rounded-[28px] sm:rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-pop-in">
            <div className="p-5 bg-[#f8fafc] border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2563eb]">savings</span>
                <h3 className="font-extrabold text-sm text-[#0f172a]">Setor Tabungan Qurban</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalSetorQurbanOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveSetorQurban} className="p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div className="p-3.5 bg-[#eff6ff] rounded-2xl border border-[#bfdbfe]">
                <span className="text-[10px] text-slate-500 font-bold block">Peserta Qurban:</span>
                <h4 className="text-sm font-extrabold text-[#0f172a]">{selectedPesertaQurban?.nama || 'Peserta'}</h4>
                <p className="text-[11px] text-slate-600">{selectedPesertaQurban?.tipe_hewan || '-'}</p>
                <div className="flex justify-between text-[11px] mt-2 pt-2 border-t border-blue-200/50">
                  <span>Saldo Saat Ini: <strong>{formatRupiah(selectedPesertaQurban?.total_terkumpul || 0)}</strong></span>
                  <span>Target: {formatRupiah(selectedPesertaQurban?.target_nominal || 0)}</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nominal Setoran (Rp) *</label>
                <RupiahInput
                  required
                  value={setorQurbanForm.jumlah}
                  onChange={(val) => setSetorQurbanForm({ ...setorQurbanForm, jumlah: val })}
                  placeholder="0"
                  className="!rounded-2xl !bg-[#f8fafc] font-black text-[#2563eb] text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Metode Pembayaran</label>
                <select
                  value={setorQurbanForm.metode}
                  onChange={(e) => setSetorQurbanForm({ ...setorQurbanForm, metode: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl font-semibold outline-none"
                >
                  <option value="Tunai">Tunai / Kas Langsung</option>
                  <option value="Transfer Bank">Transfer Bank</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan / Keterangan</label>
                <input
                  type="text"
                  value={setorQurbanForm.keterangan}
                  onChange={(e) => setSetorQurbanForm({ ...setorQurbanForm, keterangan: e.target.value })}
                  placeholder="Setoran Tabungan Qurban"
                  className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-2xl font-semibold outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalSetorQurbanOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-2xl font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-2xl font-extrabold transition-all shadow-md shadow-[#2563eb]/20 cursor-pointer"
                >
                  Konfirmasi Setoran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NOTA / STRUK / KUITANSI CETAK */}
      {/* ========================================================================= */}
      {modalNotaOpen && notaData && (
        <div className="fixed inset-0 z-[100] bg-slate-950/40 flex items-center justify-center p-4 sm:p-6 md:pl-64 lg:pl-68 overflow-y-auto animate-fade-in">
          <div className="bg-white w-full max-w-md max-h-[88vh] my-auto rounded-[28px] sm:rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-pop-in">
            <div className="p-4 bg-[#f8fafc] border-b border-slate-100 flex items-center justify-between">
              <span className="font-extrabold text-xs text-[#0f172a]">Bukti Transaksi Resmi</span>
              <button
                type="button"
                onClick={() => setModalNotaOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div id="printArea" className="p-6 text-xs space-y-4 font-mono">
              <div className="text-center border-b border-dashed border-slate-300 pb-3">
                <h3 className="font-bold text-sm text-[#0f172a] uppercase">{settings.namaKoperasi || 'KOPERASI IDAMAN'}</h3>
                <p className="text-[10px] text-slate-500">{settings.alamat || 'Jl. Situtarate - Cibaduyut'}</p>
                <p className="text-[10px] text-slate-500">Telp: {settings.telepon || '085323066335'}</p>
              </div>

              {notaData.tipe === 'sembako' ? (
                <>
                  <div className="flex justify-between text-[11px]">
                    <span>No. Nota: <strong>{notaData.id}</strong></span>
                    <span>{notaData.tanggal}</span>
                  </div>
                  <div className="text-[11px]">
                    <span>Pembeli: {notaData.pembeli} ({notaData.nomor_anggota})</span>
                  </div>

                  <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1">
                    {notaData.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-[11px]">
                        <span>{item.nama} x{item.qty}</span>
                        <span>{formatRupiah((item.harga_jual || 0) * (item.qty || 1))}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between font-bold text-[#0f172a]">
                      <span>TOTAL BELANJA:</span>
                      <span>{formatRupiah(notaData.total)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Tunai / Bayar:</span>
                      <span>{formatRupiah(notaData.bayar)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Kembalian:</span>
                      <span>{formatRupiah(notaData.kembali)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center font-bold text-sm py-1 bg-slate-100 rounded-lg">
                    KUITANSI TABUNGAN QURBAN
                  </div>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">No. Kuitansi:</span>
                      <strong>{notaData.id}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tanggal:</span>
                      <span>{notaData.tanggal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Nama Peserta:</span>
                      <strong>{notaData.nama_peserta}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Jenis Transaksi:</span>
                      <span className="font-bold text-emerald-600">{notaData.tipe}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Jumlah:</span>
                      <strong className="text-sm text-[#2563eb]">{formatRupiah(notaData.jumlah)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Metode:</span>
                      <span>{notaData.metode || 'Tunai'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Keterangan:</span>
                      <span>{notaData.keterangan}</span>
                    </div>
                  </div>
                </>
              )}

              <div className="text-center pt-4 border-t border-dashed border-slate-300 text-[10px] text-slate-400">
                Terima kasih atas keikutsertaan dan kepercayaannya bersama {settings.namaKoperasi || 'Koperasi Idaman'}.
              </div>
            </div>

            <div className="p-4 bg-[#f8fafc] border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalNotaOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-2xl font-bold text-xs"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={printNotaContent}
                className="px-5 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-2xl font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-[#2563eb]/20 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                Cetak Dokumen
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
