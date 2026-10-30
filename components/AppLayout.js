'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { authService } from '../lib/authService';
import { dataService } from '../lib/dataService';
import { getSupabaseClient } from '../lib/supabase';
import AppLogo from './AppLogo';

export default function AppLayout({ children, title, subtitle, rightAction }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      if (pathname !== '/login') {
        router.replace('/login');
      }
      return;
    }

    setCurrentUser(user);
    setIsAuthReady(true);

    // Auto sync data dari Supabase Cloud setiap kali aplikasi dibuka
    const syncCloud = async () => {
      setIsSyncing(true);
      try {
        await dataService.fetchFromSupabase();
        await authService.fetchUsersFromSupabase();
      } catch (_) {}
      setIsSyncing(false);
    };

    syncCloud();

    // Supabase Realtime Subscription: Update otomatis setiap kali ada perubahan di komputer lain
    const client = getSupabaseClient();
    let channel = null;
    if (client) {
      try {
        channel = client
          .channel('realtime_koperasi_changes')
          .on('postgres_changes', { event: '*', schema: 'public' }, () => {
            syncCloud();
          })
          .subscribe();
      } catch (err) {
        console.warn('Realtime subscription error:', err);
      }
    }

    // Auto re-sync saat jendela browser kembali aktif (focus / switch tab)
    const handleWindowFocus = () => syncCloud();
    window.addEventListener('focus', handleWindowFocus);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') syncCloud();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const handleAuthUpdate = () => {
      const u = authService.getCurrentUser();
      if (!u && pathname !== '/login') {
        router.replace('/login');
        return;
      }
      if (u) {
        setCurrentUser(u);
        setIsAuthReady(true);
      }
    };

    window.addEventListener('koperasi_auth_updated', handleAuthUpdate);
    return () => {
      window.removeEventListener('koperasi_auth_updated', handleAuthUpdate);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (channel && client) {
        client.removeChannel(channel);
      }
    };
  }, [pathname, router]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await dataService.fetchFromSupabase();
      await authService.fetchUsersFromSupabase();
    } catch (_) {}
    setIsSyncing(false);
  };

  const handleLogoutConfirm = () => {
    authService.logout();
    setLogoutModalOpen(false);
    router.replace('/login');
  };

  const navigation = [
    { name: 'Home', label: 'Beranda', href: '/', icon: 'grid_view' },
    { name: 'Anggota', label: 'Anggota', href: '/anggota', icon: 'group' },
    { name: 'Simpanan', label: 'Simpanan', href: '/simpanan', icon: 'savings' },
    { name: 'Pinjaman', label: 'Pinjaman', href: '/pinjaman', icon: 'payments' },
    { name: 'Kas & Buku', label: 'Transaksi Kas', href: '/kas', icon: 'receipt_long' },
    { name: 'Usaha & Qurban', label: 'Usaha & Qurban', href: '/usaha', icon: 'storefront' },
    { name: 'Daftar Tagihan', label: 'Daftar Tagihan', href: '/tagihan', icon: 'fact_check' },
    { name: 'Laporan', label: 'Laporan', href: '/laporan', icon: 'bar_chart' },
    ...(currentUser?.role === 'Super Admin' ? [{ name: 'Pengaturan', label: 'Pengaturan', href: '/pengaturan', icon: 'settings' }] : [])
  ];

  const isActive = (href) => {
    if (href === '/' && pathname === '/') return true;
    if (href !== '/' && pathname.startsWith(href)) return true;
    return false;
  };

  // Jangan render dashboard/layout jika belum terautentikasi (mencegah kedipan/blits)
  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center font-sans">
        <div className="w-10 h-10 border-4 border-[#2563eb]/20 border-t-[#2563eb] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] flex flex-col md:flex-row font-sans antialiased text-[#0f172a]">
      {/* ==================== DESKTOP SIDEBAR ==================== */}
      <aside className="hidden md:flex flex-col w-64 lg:w-68 shrink-0 bg-gradient-to-b from-[#1e40af] via-[#1d4ed8] to-[#1e3a8a] text-white h-screen sticky top-0 z-30 shadow-xl border-r border-blue-800/30 justify-between select-none">
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* App Brand Logo */}
          <div className="p-5 pb-4 flex items-center gap-3 border-b border-white/10 shrink-0">
            <AppLogo className="w-9 h-9" />
            <div className="flex flex-col">
              <h1 className="text-base font-extrabold tracking-tight text-white leading-tight">
                Koperasi<span className="text-[#ffd159]">.id</span>
              </h1>
              <span className="text-[10px] text-blue-100/80 font-bold tracking-wider uppercase">Sistem Terpadu</span>
            </div>
          </div>

          {/* Navigation Menu Links */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs transition-all duration-200 group ${
                    active
                      ? 'bg-white text-[#2563eb] font-extrabold shadow-md scale-[1.02]'
                      : 'text-white/80 hover:text-white hover:bg-white/10 font-bold hover:translate-x-1'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:scale-110 ${active ? 'text-[#2563eb]' : 'text-white/80'}`}>
                    {item.icon}
                  </span>
                  <span className="tracking-wide">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar: Compact User Profile & Quick Logout */}
        <div className="p-2.5 px-3 border-t border-white/10 shrink-0">
          <div className="flex items-center justify-between gap-2 p-1.5 pl-2 rounded-xl bg-black/20 hover:bg-black/30 border border-white/10 transition-all">
            <Link
              href="/pengaturan"
              className="flex items-center gap-2 min-w-0 flex-1 group cursor-pointer"
              title="Pengaturan Profil Akun"
            >
              <div className="w-7 h-7 rounded-lg bg-[#ffd159] text-[#0f172a] flex items-center justify-center font-black text-[11px] shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                {currentUser?.avatar || 'AD'}
              </div>
              <div className="flex flex-col min-w-0 flex-1 leading-tight">
                <span className="text-[11px] font-bold text-white truncate group-hover:text-[#ffd159] transition-colors">
                  {currentUser?.nama || 'Administrator'}
                </span>
                <span className="text-[9px] text-blue-200/80 font-medium truncate flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                  <span className="truncate">{currentUser?.role || 'Super Admin'}</span>
                </span>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setLogoutModalOpen(true)}
              className="p-1.5 text-white/60 hover:text-rose-300 hover:bg-white/10 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Keluar / LogOut"
            >
              <span className="material-symbols-outlined text-[17px] block">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ==================== MOBILE HEADER BAR ==================== */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#1e40af] text-white sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-2">
          <AppLogo className="w-8 h-8" />
          <span className="font-extrabold text-base tracking-tight">Koperasi Idaman</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 cursor-pointer disabled:opacity-50"
            title="Sinkronkan Cloud"
          >
            <span className={`material-symbols-outlined text-lg ${isSyncing ? 'animate-spin' : ''}`}>
              {isSyncing ? 'sync' : 'cloud_sync'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setLogoutModalOpen(true)}
            className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 cursor-pointer"
            title="Logout"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg bg-white/20 text-white cursor-pointer"
          >
            <span className="material-symbols-outlined text-2xl">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#1e40af] px-4 py-3 text-white shadow-xl space-y-1 border-b border-blue-700 animate-slide-down">
          <Link
            href="/pengaturan"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 p-2.5 bg-white/10 rounded-2xl mb-3 hover:bg-white/15 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-[#ffd159] text-[#0f172a] flex items-center justify-center font-bold text-xs shrink-0">
              {currentUser?.avatar || 'AD'}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-bold truncate">{currentUser?.nama || 'Administrator'}</span>
              <span className="text-[10px] text-blue-100 truncate">{currentUser?.role || 'Super Admin'}</span>
            </div>
            <span className="material-symbols-outlined text-white/50 text-base">settings</span>
          </Link>

          {navigation.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                  active ? 'bg-white text-[#2563eb]' : 'text-white/80 hover:bg-white/10'
                }`}
              >
                <span className="material-symbols-outlined text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* ==================== MAIN CONTENT FULL FRAME ==================== */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto bg-[#f8fafc]">
        {/* Page Inner Container with Smooth Entrance */}
        <div className="p-6 lg:p-8 flex-1 flex flex-col max-w-[1700px] w-full mx-auto animate-fade-in">
          {/* Dynamic Page Header Title & Action (if supplied) */}
          {(title || rightAction) && (
            <div className="pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                {title && (
                  <h1 className="text-xl md:text-2xl font-extrabold text-[#0f172a] tracking-tight">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{subtitle}</p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-full text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-60"
                  title="Sinkronkan data dengan Supabase Cloud sekarang"
                >
                  <span className={`material-symbols-outlined text-[16px] ${isSyncing ? 'animate-spin text-[#2563eb]' : 'text-emerald-500'}`}>
                    {isSyncing ? 'sync' : 'cloud_sync'}
                  </span>
                  <span className="hidden sm:inline">{isSyncing ? 'Menyinkronkan...' : 'Sinkron Cloud'}</span>
                </button>
                {rightAction}
              </div>
            </div>
          )}

          {/* Children Page Content */}
          <div className="flex-1">{children}</div>

          {/* Minimalist Sub-Footer */}
          <footer className="mt-12 pt-4 border-t border-slate-200 text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>&copy; {new Date().getFullYear()} <strong>Koperasi Idaman</strong> &bull; Sistem Informasi Manajemen Terpadu</span>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-[#2563eb] font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Online: {currentUser?.role || 'Super Admin'}
              </span>
            </div>
          </footer>
        </div>
      </main>

      {/* ==================== LOGOUT CONFIRMATION MODAL ==================== */}
      {logoutModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/40 flex items-center justify-center p-4 sm:p-6 md:pl-64 lg:pl-68 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full my-auto shadow-2xl border border-slate-100 overflow-hidden flex flex-col text-xs animate-pop-in">
            <div className="p-5 bg-gradient-to-r from-[#1d4ed8] to-[#2563eb] text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-2xl text-[#ffd159]">logout</span>
              </div>
              <div>
                <h3 className="text-sm font-extrabold">Konfirmasi Keluar</h3>
                <p className="text-[11px] text-white/80">Akhiri sesi pengguna aktif</p>
              </div>
            </div>

            <div className="p-6 text-slate-600 font-medium">
              Apakah Anda yakin ingin keluar dari sistem <strong>Koperasi Idaman</strong>? Anda perlu login kembali untuk mengakses data.
            </div>

            <div className="p-4 bg-[#f8fafc] border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setLogoutModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-full font-bold text-slate-600 hover:bg-slate-100 btn-interactive cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleLogoutConfirm}
                className="px-5 py-2 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-full font-bold shadow-sm btn-interactive cursor-pointer"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
