import React, { useMemo, useState } from 'react';
import {
  FileUp,
  Palette,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import { ExamSession, Teacher } from '../types/schedule';
import { getTeacherColorHex, hexToRgba, TEACHER_COLOR_PALETTE } from '../utils/colors';
import { formatIndonesianDate } from '../utils/scheduler';

interface TeachersViewProps {
  teachers: Teacher[];
  sessions: ExamSession[];
  teacherTotalCounts: Record<string, number>;
  onAddTeacher: (teacher: Omit<Teacher, 'id'>) => void;
  onBulkAddTeachers: (items: Array<Omit<Teacher, 'id'>>) => void;
  onUpdateTeacher: (teacher: Teacher) => void;
  onDeleteTeacher: (id: string) => void;
  onAssignDistinctColors: () => void;
}

export const TeachersView: React.FC<TeachersViewProps> = ({
  teachers,
  sessions,
  teacherTotalCounts,
  onAddTeacher,
  onBulkAddTeachers,
  onUpdateTeacher,
  onDeleteTeacher,
  onAssignDistinctColors,
}) => {
  const [query, setQuery] = useState('');
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [nip, setNip] = useState('');
  const [subjectsText, setSubjectsText] = useState('');
  const [maxSessions, setMaxSessions] = useState<string>('');
  const [active, setActive] = useState(true);
  const [color, setColor] = useState(TEACHER_COLOR_PALETTE[0].hex);
  const [unavailableIds, setUnavailableIds] = useState<string[]>([]);

  const filteredTeachers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter(
      (t) =>
        t.code.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.nip.toLowerCase().includes(q) ||
        t.subjects.some((s) => s.toLowerCase().includes(q))
    );
  }, [teachers, query]);

  const getNextCode = (offset = 0) => {
    const num = teachers.length + 1 + offset;
    return String(num).padStart(2, '0');
  };

  const openCreateModal = () => {
    setIsCreating(true);
    setEditingTeacher(null);
    setCode(getNextCode());
    setName('');
    setNip('');
    setSubjectsText('');
    setMaxSessions('');
    setActive(true);
    setColor(TEACHER_COLOR_PALETTE[teachers.length % TEACHER_COLOR_PALETTE.length].hex);
    setUnavailableIds([]);
  };

  const openEditModal = (t: Teacher) => {
    const idx = teachers.findIndex((item) => item.id === t.id);
    setIsCreating(false);
    setEditingTeacher(t);
    setCode(t.code);
    setName(t.name);
    setNip(t.nip);
    setSubjectsText(t.subjects.join(', '));
    setMaxSessions(t.maxSessions === null ? '' : String(t.maxSessions));
    setActive(t.active);
    setColor(getTeacherColorHex(t, idx >= 0 ? idx : 0));
    setUnavailableIds(t.unavailableSessionIds);
  };

  const closeFormModal = () => {
    setIsCreating(false);
    setEditingTeacher(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const subjects = subjectsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const parsedMax =
      maxSessions.trim() === '' ? null : Math.max(0, parseInt(maxSessions, 10) || 0);

    const payload: Omit<Teacher, 'id'> = {
      code: code.trim() || getNextCode(),
      name: name.trim(),
      nip: nip.trim(),
      subjects,
      unavailableSessionIds: unavailableIds,
      maxSessions: parsedMax,
      active,
      color,
    };

    if (isCreating) {
      onAddTeacher(payload);
    } else if (editingTeacher) {
      onUpdateTeacher({ ...payload, id: editingTeacher.id });
    }
    closeFormModal();
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    const newTeachers: Array<Omit<Teacher, 'id'>> = lines.map((line, index) => {
      const parts = line.split(/[;\t|]+/).map((p) => p.trim());
      const parsedName = parts[0] || `Guru ${index + 1}`;
      const parsedNip = parts[1] || '';
      const parsedSubjects = parts[2]
        ? parts[2]
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
      return {
        code: getNextCode(index),
        name: parsedName,
        nip: parsedNip,
        subjects: parsedSubjects,
        unavailableSessionIds: [],
        maxSessions: null,
        active: true,
        color:
          TEACHER_COLOR_PALETTE[(teachers.length + index) % TEACHER_COLOR_PALETTE.length].hex,
      };
    });

    onBulkAddTeachers(newTeachers);
    setBulkText('');
    setShowBulkModal(false);
  };

  const toggleUnavailable = (sessionId: string) => {
    setUnavailableIds((prev) =>
      prev.includes(sessionId) ? prev.filter((id) => id !== sessionId) : [...prev, sessionId]
    );
  };

  return (
    <div className="space-y-5">
      {/* Header Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari kode, nama guru, NIP, atau mapel..."
            className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onAssignDistinctColors}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
            title="Atur ulang warna berbeda untuk setiap guru"
          >
            <Palette className="h-4 w-4" />
            Bedakan Warna Guru
          </button>
          <button
            type="button"
            onClick={() => setShowBulkModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileUp className="h-4 w-4" />
            Impor Daftar Guru
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Tambah Pengawas
          </button>
        </div>
      </div>

      {/* Teachers Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredTeachers.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-900">
              {teachers.length === 0
                ? 'Belum ada data pengawas'
                : 'Tidak ada pengawas yang cocok dengan pencarian'}
            </p>
            <p className="text-xs text-slate-500">
              Tambahkan guru pengawas satu per satu atau gunakan fitur Impor Daftar Guru.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700">
                  <th className="px-4 py-3 w-28">Kode & Warna</th>
                  <th className="px-4 py-3">Nama Pengawas & NIP</th>
                  <th className="px-4 py-3">Mapel Diampu</th>
                  <th className="px-4 py-3">Berhalangan</th>
                  <th className="px-4 py-3 text-right">Beban Tugas</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right w-32">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredTeachers.map((t, idx) => {
                  const totalAssigned = teacherTotalCounts[t.id] ?? 0;
                  const teacherHex = getTeacherColorHex(t, idx);
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-xs font-semibold"
                          style={{
                            backgroundColor: hexToRgba(teacherHex, 0.12),
                            borderColor: hexToRgba(teacherHex, 0.35),
                            color: teacherHex,
                          }}
                        >
                          <span
                            className="h-2 w-2 rounded-[2px] shrink-0"
                            style={{ backgroundColor: teacherHex }}
                          />
                          {t.code}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{t.name}</div>
                        <div className="text-xs font-mono tabular-nums text-slate-500">
                          {t.nip ? `NIP. ${t.nip}` : 'NIP belum diisi'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">
                        {t.subjects.length > 0 ? t.subjects.join(', ') : 'Umum'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 font-mono tabular-nums">
                        {t.unavailableSessionIds.length > 0
                          ? `${t.unavailableSessionIds.length} sesi`
                          : 'Selalu siap'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-xs">
                        <span className="font-semibold text-slate-900">{totalAssigned}</span>
                        {t.maxSessions !== null && (
                          <span className="text-slate-500"> / maks {t.maxSessions}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => onUpdateTeacher({ ...t, active: !t.active })}
                          className={`inline-flex items-center gap-1 text-xs font-medium cursor-pointer ${
                            t.active ? 'text-emerald-700' : 'text-slate-400'
                          }`}
                          title="Klik untuk aktif/nonaktifkan pengawas"
                        >
                          {t.active ? (
                            <>
                              <UserCheck className="h-3.5 w-3.5" />
                              Aktif
                            </>
                          ) : (
                            <>
                              <UserX className="h-3.5 w-3.5" />
                              Nonaktif
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {confirmDeleteId === t.id ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteTeacher(t.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-1 rounded bg-red-600 text-white text-xs font-semibold hover:bg-red-700 cursor-pointer"
                            >
                              Hapus
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 rounded border border-slate-200 text-xs text-slate-600 hover:bg-slate-100 cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(t)}
                              className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                              aria-label={`Edit ${t.name}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(t.id)}
                              className="p-1.5 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                              aria-label={`Hapus ${t.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Teacher Modal */}
      {(isCreating || editingTeacher) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 no-print">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-lg">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                {isCreating ? 'Tambah Guru Pengawas' : 'Edit Data Pengawas'}
              </h3>
              <button
                type="button"
                onClick={closeFormModal}
                className="p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kode Pengawas
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="01"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Lengkap & Gelar
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Budi Santoso, S.Pd."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NIP / NUPTK (Opsional)
                  </label>
                  <input
                    type="text"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="198103122008011004"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Maksimal Jam Mengawas (Opsional)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={maxSessions}
                    onChange={(e) => setMaxSessions(e.target.value)}
                    placeholder="Kosongkan jika bebas"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mata Pelajaran yang Diampu (pisahkan dengan koma)
                </label>
                <input
                  type="text"
                  value={subjectsText}
                  onChange={(e) => setSubjectsText(e.target.value)}
                  placeholder="Contoh: Matematika, Informatika"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Digunakan untuk mencegah guru mengawas mata pelajaran yang diampunya sendiri.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Warna Pembeda di Jadwal
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {TEACHER_COLOR_PALETTE.map((preset) => {
                    const selected = color.toLowerCase() === preset.hex.toLowerCase();
                    return (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={() => setColor(preset.hex)}
                        title={preset.name}
                        className={`h-7 w-7 rounded-md border transition-transform cursor-pointer ${
                          selected
                            ? 'ring-2 ring-slate-900 ring-offset-1 scale-105 border-white'
                            : 'border-slate-200 hover:scale-105'
                        }`}
                        style={{ backgroundColor: preset.hex }}
                        aria-label={`Pilih warna ${preset.name}`}
                      />
                    );
                  })}
                  <label
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 cursor-pointer hover:bg-slate-50"
                    title="Pilih warna kustom"
                  >
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="h-5 w-5 rounded border-0 bg-transparent p-0 cursor-pointer"
                    />
                    <span className="font-mono">{color.toUpperCase()}</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Slot Jam Berhalangan / Tidak Dapat Mengawas ({unavailableIds.length} dipilih)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-3 border border-slate-200 rounded-lg bg-slate-50/70">
                  {sessions.map((s) => {
                    const checked = unavailableIds.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className={`flex items-start gap-2 rounded-md border p-2 text-xs cursor-pointer ${
                          checked
                            ? 'border-red-300 bg-red-50 text-red-900'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleUnavailable(s.id)}
                          className="mt-0.5 rounded border-slate-300 text-red-600"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold">
                            {s.dayLabel}, {formatIndonesianDate(s.date, true)} ·{' '}
                            {s.shiftGroup ? `${s.shiftGroup} · ` : ''}Jam ke-{s.sessionNumber}
                          </div>
                          <div className="text-[11px] opacity-80 truncate">
                            {s.timeRange} · {s.subject}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-700"
                />
                <span>Pengawas aktif (diikutsertakan dalam penyusunan jadwal)</span>
              </label>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={closeFormModal}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 cursor-pointer"
                >
                  Simpan Pengawas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 no-print">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-lg">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Impor Daftar Guru Cepat
              </h3>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleBulkSubmit} className="p-5 space-y-4">
              <div className="text-xs text-slate-600 space-y-1">
                <p>
                  Tempel daftar guru satu baris per orang. Format fleksibel (pisahkan kolom dengan tanda <code className="font-mono bg-slate-100 px-1 rounded">|</code> atau <code className="font-mono bg-slate-100 px-1 rounded">;</code> atau salin langsung dari Excel):
                </p>
                <pre className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono text-[11px] text-slate-700">
                  Ahmad Subarjo, S.Pd. | 198201012009011001 | Matematika{'\n'}
                  Sri Wahyuni, M.Pd. | 198605122011012005 | Bahasa Indonesia
                </pre>
              </div>
              <textarea
                rows={7}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="Tempel daftar nama guru di sini..."
                className="w-full rounded-lg border border-slate-300 p-3 text-sm font-mono focus:border-blue-600 focus:outline-none"
                required
              />
              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 cursor-pointer"
                >
                  Tambahkan ke Daftar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
