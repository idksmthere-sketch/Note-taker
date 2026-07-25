import React, { useState } from 'react';
import { Lock, ShieldAlert, KeyRound, Check, RefreshCw } from 'lucide-react';

interface VaultManagerProps {
  isOpen: boolean;
  hasExistingVault: boolean;
  onUnlock: (passphrase: string) => Promise<boolean>;
  onCreateVault: (passphrase: string) => Promise<void>;
  onClose: () => void;
}

export const VaultManager: React.FC<VaultManagerProps> = ({
  isOpen,
  hasExistingVault,
  onUnlock,
  onCreateVault,
  onClose,
}) => {
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!passphrase || passphrase.length < 6) {
      setError('Passphrase must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (hasExistingVault) {
        const success = await onUnlock(passphrase);
        if (success) {
          setPassphrase('');
          onClose();
        } else {
          setError('Incorrect master passphrase. Decryption failed.');
        }
      } else {
        if (passphrase !== confirmPassphrase) {
          setError('Passphrases do not match.');
          setLoading(false);
          return;
        }
        await onCreateVault(passphrase);
        setPassphrase('');
        setConfirmPassphrase('');
        onClose();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Vault operation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-indigo-950/80 border border-indigo-800/60 text-indigo-400">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {hasExistingVault ? 'Unlock Encrypted Vault' : 'Create Zero-Trust Vault'}
            </h2>
            <p className="text-xs text-slate-400">
              Web Crypto API • PBKDF2 + AES-GCM 256-bit
            </p>
          </div>
        </div>

        <div className="mb-4 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1.5">
          <div className="flex items-start gap-2 text-indigo-300 font-semibold">
            <ShieldAlert className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            Zero-Trust Credential Storage
          </div>
          <p className="text-slate-400 leading-relaxed">
            Your Zoom credentials and API keys are encrypted locally on this device using Web Crypto API before writing to IndexedDB. The backend never stores keys on disk.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {hasExistingVault ? 'Master Vault Passphrase' : 'New Master Passphrase'}
            </label>
            <div className="relative">
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Enter passphrase..."
                className="w-full px-3 py-2 pl-9 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                autoFocus
              />
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>
          </div>

          {!hasExistingVault && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Confirm Master Passphrase
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassphrase}
                  onChange={(e) => setConfirmPassphrase(e.target.value)}
                  placeholder="Re-enter passphrase..."
                  className="w-full px-3 py-2 pl-9 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>
          )}

          {error && (
            <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800/60 text-xs text-red-300">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Decrypting...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  {hasExistingVault ? 'Unlock Vault' : 'Initialize Vault'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
