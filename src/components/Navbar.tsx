import React, { useEffect, useState } from 'react';
import { Lock, Unlock, Download, FileText, WifiOff } from 'lucide-react';
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
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-900 tracking-tight">NoteTaker</h1>
              <p className="text-xs text-gray-500">Meeting notes & vision capture</p>
            </div>
          </div>

          {/* Status & Actions */}
          <div className="flex items-center gap-2.5">
            {/* Offline Badge */}
            {isOffline && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md">
                <WifiOff className="w-3 h-3" />
                Offline
              </span>
            )}

            {/* Session Status Pill */}
            {status.active ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-200 rounded-md text-green-700 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                <span>{status.phase === 'ACTIVE_RECORDING' ? 'Recording' : status.phase}</span>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-md text-gray-500 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                <span>Standby</span>
              </div>
            )}

            {/* Vault Lock/Unlock Button */}
            <button
              onClick={onToggleVaultLock}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition border ${
                isVaultUnlocked
                  ? 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200'
              }`}
              title={isVaultUnlocked ? 'Vault unlocked' : 'Vault locked'}
            >
              {isVaultUnlocked ? (
                <>
                  <Unlock className="w-3 h-3 text-green-500" />
                  <span>Unlocked</span>
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3 text-gray-400" />
                  <span>Vault</span>
                </>
              )}
            </button>

            {/* Install PWA Button */}
            {deferredPrompt && (
              <button
                onClick={handleInstallPWA}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition"
              >
                <Download className="w-3 h-3" />
                Install
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
