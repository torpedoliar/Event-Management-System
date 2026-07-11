/**
 * StationSetupModal Component
 * Modal dialog for configuring check-in station identity and offline mode settings
 */

'use client';

import React, { useState, useEffect } from 'react';
import { indexedDBService, StationConfig } from '../lib/indexeddb';
import { offlineSyncService } from '../lib/offline-sync.service';
import { generateUUID } from '../lib/utils';
import { HelpCircle } from 'lucide-react';

interface StationSetupModalProps {
  isOpen: boolean;
  onComplete: (config: StationConfig) => void;
  existingConfig?: StationConfig | null;
}

export default function StationSetupModal({ isOpen, onComplete, existingConfig }: StationSetupModalProps) {
  const [stationName, setStationName] = useState('');
  const [enableOfflineMode, setEnableOfflineMode] = useState(true);
  const [syncInterval, setSyncInterval] = useState(30);
  const [stationId, setStationId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (existingConfig) {
      setStationName(existingConfig.stationName);
      setStationId(existingConfig.stationId);
    } else {
      // Generate new station ID
      setStationId(generateUUID());
    }
  }, [existingConfig]);

  const handleSave = async () => {
    if (!stationName.trim()) {
      setError('Nama station harus diisi');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const config: StationConfig = {
        stationId,
        stationName: stationName.trim(),
        eventId: 'auto', // Will be populated during registration
        lastSyncAt: existingConfig?.lastSyncAt,
        isActive: true
      };

      // Save to IndexedDB
      await indexedDBService.saveStationConfig(config);

      // Register with backend if online
      try {
        const response = await fetch('/api/stations/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stationId: config.stationId,
            stationName: config.stationName,
            // eventId will be fetched and updated when we get active event
          })
        });

        if (response.ok) {
          const data = await response.json();
          config.eventId = data.eventId;
          await indexedDBService.saveStationConfig(config);
        }
      } catch (err) {
        // Backend might be offline, continue with local config
        console.log('Station registered locally, will sync when backend available');
      }

      // Initialize offline sync service
      if (enableOfflineMode) {
        await offlineSyncService.init(stationId, stationName, syncInterval);
      }

      onComplete(config);
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan konfigurasi station');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Don't close if no config exists
    if (!existingConfig) return;
    onComplete(existingConfig);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={existingConfig ? 'Pengaturan Station' : 'Setup Station Baru'}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="surface-elevated max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-panel">
        {/* Header */}
        <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-primary/10 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-brand-text">
                {existingConfig ? 'Pengaturan Station' : 'Setup Station Baru'}
              </h2>
              <p className="text-sm text-brand-textMuted">
                Konfigurasi identitas dan mode offline
              </p>
            </div>
          </div>
          {existingConfig && (
            <button
              onClick={handleClose}
              aria-label="Tutup"
              className="text-brand-textDim hover:text-brand-text transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-6">
          {/* Intro explanation */}
          <div className="bg-brand-primary/5 border border-brand-primary/10 rounded-lg p-4">
            <div className="flex gap-3">
              <HelpCircle size={18} className="text-brand-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-brand-text">Selamat datang!</p>
                <p className="text-xs text-brand-textMuted leading-relaxed">
                  Station adalah perangkat check-in Anda (HP, tablet, atau laptop). Beri nama yang mudah dikenali agar laporan check-in rapi. Jika venue punya internet tidak stabil, aktifkan mode offline agar check-in tetap jalan.
                </p>
              </div>
            </div>
          </div>

          {/* Station Name */}
          <div>
            <label className="block text-sm font-medium text-brand-textMuted mb-2">
              Nama Station
            </label>
            <input
              type="text"
              value={stationName}
              onChange={(e) => {
                setStationName(e.target.value);
                setError('');
              }}
              placeholder="Contoh: Station A - Pintu Utama"
              className="w-full px-4 py-2 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-brand-text placeholder:text-brand-textDim"
              disabled={isLoading}
            />
            <p className="mt-1.5 text-xs text-brand-textDim leading-relaxed">
              Nama ini muncul di laporan dan history check-in. Gunakan nama lokasi agar mudah diingat, misalnya "Lobby Utama" atau "Pintu Timur".
            </p>
          </div>

          {/* Station ID Display */}
          <div className="bg-brand-bg/50 rounded-lg p-4 border border-brand-border">
            <div className="flex items-center gap-2 mb-1">
              <label className="text-xs font-medium text-brand-textDim">
                Station ID (Otomatis)
              </label>
              <div className="group relative">
                <HelpCircle size={12} className="text-brand-textDim cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-brand-bgElevated border border-brand-border rounded-lg text-xs text-brand-text shadow-panel w-56 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-10">
                  ID unik untuk perangkat ini. Dibuat otomatis — Anda tidak perlu mengubahnya. Digunakan sistem untuk membedakan data check-in antar perangkat.
                </div>
              </div>
            </div>
            <code className="text-xs text-brand-textMuted break-all">
              {stationId}
            </code>
          </div>

          {/* Offline Mode Toggle */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="enableOffline"
              checked={enableOfflineMode}
              onChange={(e) => setEnableOfflineMode(e.target.checked)}
              className="mt-1 w-4 h-4 text-brand-primary border-brand-border rounded focus:ring-brand-primary bg-brand-bg"
              disabled={isLoading}
            />
            <label htmlFor="enableOffline" className="flex-1">
              <span className="block text-sm font-medium text-brand-textMuted">
                Aktifkan Mode Offline
              </span>
              <span className="block text-xs text-brand-textDim leading-relaxed mt-0.5">
                Saat internet mati, check-in tetap jalan menggunakan data lokal. Begitu internet kembali, data otomatis tersync ke server. <strong className="text-brand-textMuted">Disarankan aktif</strong> untuk venue dengan koneksi tidak stabil.
              </span>
            </label>
          </div>

          {/* Sync Interval */}
          {enableOfflineMode && (
            <div>
              <label className="block text-sm font-medium text-brand-textMuted mb-2">
                Interval Sinkronisasi (detik)
              </label>
              <input
                type="number"
                min="10"
                max="120"
                value={syncInterval}
                onChange={(e) => setSyncInterval(parseInt(e.target.value) || 30)}
                className="w-full px-4 py-2 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-brand-text"
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-brand-textDim">
                Setiap {syncInterval} detik akan mencoba sinkronisasi check-in yang pending
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-brand-danger/10 border border-brand-danger/30 rounded-lg p-3">
              <p className="text-sm text-brand-danger">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-brand-border flex justify-end gap-3">
          {existingConfig ? (
            <button
              onClick={handleClose}
              className="px-4 py-2 text-brand-textMuted hover:bg-brand-surfaceMuted rounded-lg transition-colors"
              disabled={isLoading}
            >
              Batal
            </button>
          ) : null}
          <button
            onClick={handleSave}
            disabled={isLoading || !stationName.trim()}
            className="px-6 py-2 bg-brand-primary hover:bg-brand-primarySoft disabled:opacity-50 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Menyimpan...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {existingConfig ? 'Simpan Perubahan' : 'Simpan & Mulai'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
