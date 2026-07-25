import React, { useEffect, useState } from 'react';
import { Lock, Unlock, ShieldCheck, Download, Radio, WifiOff } from 'lucide-react';
import { SessionStatus } from '../types';

interface NavbarProps {
  status: SessionStatus;
  isVaultUnlocked: boolean;
  onToggleVaultLock: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ status, isVaultUnlocked, onToggleVaultLock }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    // Listen for PWA installation event
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstallPWA = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        setDeferredPrompt(null);
      });
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Radio className="w-5 h-5 text-indigo-400 animate-pulse" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">Zoom NoteBot AI</h1>
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-300 bg-cyan-950/80 border border-cyan-800/60 rounded-full">
                  PWA
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Zero-Trust Encrypted • WebCrypto
              </p>
            </div>
          </div>

          {/* Status & Actions */}
          <div className="flex items-center gap-3">
            {/* Offline Badge */}
            {isOffline && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-300 bg-amber-950/70 border border-amber-800/60 rounded-lg">
                <WifiOff className="w-3.5 h-3.5" />
                Offline Mode
              </span>
            )}

            {/* Session Status Pill */}
            {status.active ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-950/80 border border-emerald-800/60 rounded-lg text-emerald-300 text-xs font-semibold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>{status.phase === 'ACTIVE_RECORDING' ? 'RECORDING MEETING' : status.phase}</span>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 border border-slate-700/60 rounded-lg text-slate-400 text-xs">
                <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                <span>Standby</span>
              </div>
            )}

            {/* Vault Lock/Unlock Button */}
            <button
              onClick={onToggleVaultLock}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition border shadow-sm ${
                isVaultUnlocked
                  ? 'bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 border-emerald-700/60'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title={isVaultUnlocked ? 'Vault Unlocked - Click to lock' : 'Vault Locked - Click to unlock'}
            >
              {isVaultUnlocked ? (
                <>
                  <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Vault Unlocked</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Unlock Vault</span>
                </>
              )}
            </button>

            {/* Install PWA Button */}
            {deferredPrompt && (
              <button
                onClick={handleInstallPWA}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition"
              >
                <Download className="w-3.5 h-3.5" />
                Install App
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
