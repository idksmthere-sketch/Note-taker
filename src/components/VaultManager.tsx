import React, { useState } from 'react';
import { Lock, Check, RefreshCw } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-md bg-gray-100 border border-gray-200 text-gray-500">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {hasExistingVault ? 'Unlock Vault' : 'Create Vault'}
            </h2>
            <p className="text-xs text-gray-500">
              Your credentials are encrypted and stored locally on this device.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {hasExistingVault ? 'Master Passphrase' : 'New Master Passphrase'}
            </label>
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Enter passphrase..."
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              autoFocus
            />
          </div>

          {!hasExistingVault && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Confirm Master Passphrase
              </label>
              <input
                type="password"
                value={confirmPassphrase}
                onChange={(e) => setConfirmPassphrase(e.target.value)}
                placeholder="Re-enter passphrase..."
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              />
            </div>
          )}

          {error && (
            <div className="p-2.5 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-xs font-medium text-gray-500 hover:text-gray-700 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  {hasExistingVault ? 'Unlocking...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  {hasExistingVault ? 'Unlock Vault' : 'Create Vault'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
