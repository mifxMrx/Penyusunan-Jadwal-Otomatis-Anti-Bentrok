import React, { useRef, useState } from 'react';
import { Download, RotateCcw, Trash2, Upload } from 'lucide-react';
import { AppState, SchoolIdentity } from '../types/schedule';

interface SchoolSettingsViewProps {
  identity: SchoolIdentity;
  fullState: AppState;
  onUpdateIdentity: (next: SchoolIdentity) => void;
  onImportState: (state: AppState) => void;
  onResetDefault: () => void;
}

export const SchoolSettingsView: React.FC<SchoolSettingsViewProps> = ({
  identity,
  fullState,
  onUpdateIdentity,
  onImportState,
  onResetDefault,
}) => {
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);
  const [statusNote, setStatusNote] = useState<string>('');
  const [confirmReset, setConfirmReset] = useState(false);

  const handleField = (key: keyof SchoolIdentity, value: string) => {
    onUpdateIdentity({ ...identity, [key]: value });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdateIdentity({ ...identity, logoDataUrl: reader.result });
        setStatusNote('Logo sekolah berhasil dipasang untuk Kop Surat A4.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(fullState, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-jadwal-ujian-${identity.schoolName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusNote('Cadangan data JSON berhasil diunduh.');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppState;
        if (parsed && parsed.identity && Array.isArray(parsed.teachers) && Array.isArray(parsed.rooms)) {
          onImportState(parsed);
          setStatusNote('Data cadangan berhasil dipulihkan.');
        } else {
          setStatusNote('Format file JSON tidak sesuai dengan struktur aplikasi.');
        }
      } catch {
        setStatusNote('Gagal membaca file JSON. Pastikan berkas valid.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {statusNote && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-medium text-blue-900">
          {statusNote}
        </div>
      )}

      {/* Kop Surat & Identitas Sekolah */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Identitas Sekolah & Kop Surat Resmi (A4)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Informasi ini tampil di bagian atas dokumen cetak A4 dan file PDF yang diekspor.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Instansi Baris 1
            </label>
            <input
              type="text"
              value={identity.institutionLine1}
              onChange={(e) => handleField('institutionLine1', e.target.value)}
              placeholder="PEMERINTAH PROVINSI ..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Instansi Baris 2
            </label>
            <input
              type="text"
              value={identity.institutionLine2}
              onChange={(e) => handleField('institutionLine2', e.target.value)}
              placeholder="DINAS PENDIDIKAN ..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Sekolah / Madrasah
            </label>
            <input
              type="text"
              value={identity.schoolName}
              onChange={(e) => handleField('schoolName', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Alamat, Telepon, Email & NPSN
            </label>
            <input
              type="text"
              value={identity.address}
              onChange={(e) => handleField('address', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Judul Dokumen Ujian
            </label>
            <input
              type="text"
              value={identity.examTitle}
              onChange={(e) => handleField('examTitle', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tahun Pelajaran
            </label>
            <input
              type="text"
              value={identity.academicYear}
              onChange={(e) => handleField('academicYear', e.target.value)}
              placeholder="2026/2027"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-blue-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Logo Upload */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {identity.logoDataUrl ? (
              <img
                src={identity.logoDataUrl}
                alt="Logo Sekolah"
                referrerPolicy="no-referrer"
                className="h-12 w-12 rounded-lg border border-slate-200 object-contain p-1 bg-white"
              />
            ) : (
              <div className="h-12 w-12 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[10px] text-slate-400">
                Tanpa Logo
              </div>
            )}
            <div>
              <div className="text-xs font-semibold text-slate-800">Logo Kop Surat (Opsional)</div>
              <div className="text-xs text-slate-500">Format PNG atau JPG, disarankan rasio 1:1.</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" />
              Unggah Logo
            </button>
            {identity.logoDataUrl && (
              <button
                type="button"
                onClick={() => onUpdateIdentity({ ...identity, logoDataUrl: undefined })}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-700 hover:bg-red-50 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Hapus
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Pengesahan & Tanda Tangan */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Pengesahan & Tanda Tangan Dokumen
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ditampilkan di bagian bawah halaman jadwal A4 dan PDF.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kota Pengesahan
            </label>
            <input
              type="text"
              value={identity.city}
              onChange={(e) => handleField('city', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tanggal Pengesahan
            </label>
            <input
              type="text"
              value={identity.approvalDate}
              onChange={(e) => handleField('approvalDate', e.target.value)}
              placeholder="25 November 2026"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Kepala Sekolah
            </label>
            <input
              type="text"
              value={identity.principalName}
              onChange={(e) => handleField('principalName', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              NIP Kepala Sekolah
            </label>
            <input
              type="text"
              value={identity.principalNip}
              onChange={(e) => handleField('principalNip', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Ketua Panitia Ujian
            </label>
            <input
              type="text"
              value={identity.committeeChairName}
              onChange={(e) => handleField('committeeChairName', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              NIP Ketua Panitia Ujian
            </label>
            <input
              type="text"
              value={identity.committeeChairNip}
              onChange={(e) => handleField('committeeChairNip', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-blue-600 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Backup & Reset */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Cadangan & Pemulihan Data
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Data tersimpan otomatis di browser Anda. Unduh berkas JSON untuk arsip atau pindah perangkat.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            Ekspor JSON
          </button>

          <input
            ref={jsonInputRef}
            type="file"
            accept="application/json"
            onChange={handleImportJson}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => jsonInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Upload className="h-4 w-4" />
            Impor JSON
          </button>

          {confirmReset ? (
            <div className="inline-flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onResetDefault();
                  setConfirmReset(false);
                  setStatusNote('Seluruh data dikembalikan ke data contoh awal.');
                }}
                className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 cursor-pointer"
              >
                Ya, Reset Data
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-red-200 text-sm font-medium text-red-700 hover:bg-red-50 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Contoh
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
