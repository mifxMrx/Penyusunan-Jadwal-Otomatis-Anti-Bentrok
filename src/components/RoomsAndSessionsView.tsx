import React, { useState } from 'react';
import { CalendarPlus, Pencil, Plus, Trash2, X } from 'lucide-react';
import { ExamSession, Room } from '../types/schedule';
import { formatIndonesianDate } from '../utils/scheduler';

interface RoomsAndSessionsViewProps {
  rooms: Room[];
  sessions: ExamSession[];
  onAddRoom: (room: Omit<Room, 'id'>) => void;
  onUpdateRoom: (room: Room) => void;
  onDeleteRoom: (id: string) => void;
  onSetAllProctorsCount: (count: 1 | 2) => void;
  onAddSession: (session: Omit<ExamSession, 'id'>) => void;
  onUpdateSession: (session: ExamSession) => void;
  onDeleteSession: (id: string) => void;
  onBulkAddSessions: (items: Array<Omit<ExamSession, 'id'>>) => void;
}

const INDONESIAN_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function getDayNameFromIso(iso: string): string {
  if (!iso) return 'Senin';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return 'Senin';
  return INDONESIAN_DAYS[d.getDay()] ?? 'Senin';
}

export const RoomsAndSessionsView: React.FC<RoomsAndSessionsViewProps> = ({
  rooms,
  sessions,
  onAddRoom,
  onUpdateRoom,
  onDeleteRoom,
  onSetAllProctorsCount,
  onAddSession,
  onUpdateSession,
  onDeleteSession,
  onBulkAddSessions,
}) => {
  const [subTab, setSubTab] = useState<'sessions' | 'rooms'>('sessions');

  // Room modal state
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [rCode, setRCode] = useState('');
  const [rName, setRName] = useState('');
  const [rLocation, setRLocation] = useState('');
  const [rCapacity, setRCapacity] = useState(32);
  const [rProctors, setRProctors] = useState<1 | 2>(1);
  const [confirmDeleteRoomId, setConfirmDeleteRoomId] = useState<string | null>(null);

  // Session modal state
  const [editingSession, setEditingSession] = useState<ExamSession | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [sDate, setSDate] = useState('2026-12-07');
  const [sDayLabel, setSDayLabel] = useState('Senin');
  const [sShiftGroup, setSShiftGroup] = useState('Sesi 1');
  const [sNumber, setSNumber] = useState(1);
  const [sTimeRange, setSTimeRange] = useState('07.30 – 09.30');
  const [sSubject, setSSubject] = useState('');
  const [sGrade, setSGrade] = useState('X / XI / XII');
  const [confirmDeleteSessionId, setConfirmDeleteSessionId] = useState<string | null>(null);

  // Quick generator modal
  const [showGenerator, setShowGenerator] = useState(false);
  const [genStartDate, setGenStartDate] = useState('2026-12-07');
  const [genDaysCount, setGenDaysCount] = useState(5);
  const [genShiftGroup, setGenShiftGroup] = useState('Sesi 1');
  const [genSessionsPerDay, setGenSessionsPerDay] = useState(2);

  const openCreateRoom = () => {
    const nextNum = rooms.length + 1;
    setCreatingRoom(true);
    setEditingRoom(null);
    setRCode(`R-${String(nextNum).padStart(2, '0')}`);
    setRName(`Ruang ${String(nextNum).padStart(2, '0')}`);
    setRLocation('');
    setRCapacity(32);
    setRProctors(1);
  };

  const openEditRoom = (room: Room) => {
    setCreatingRoom(false);
    setEditingRoom(room);
    setRCode(room.code);
    setRName(room.name);
    setRLocation(room.location);
    setRCapacity(room.capacity);
    setRProctors(room.proctorsRequired);
  };

  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Omit<Room, 'id'> = {
      code: rCode.trim() || `R-${rooms.length + 1}`,
      name: rName.trim() || rCode.trim(),
      location: rLocation.trim(),
      capacity: Math.max(1, Number(rCapacity) || 30),
      proctorsRequired: rProctors,
    };
    if (creatingRoom) {
      onAddRoom(payload);
    } else if (editingRoom) {
      onUpdateRoom({ ...payload, id: editingRoom.id });
    }
    setCreatingRoom(false);
    setEditingRoom(null);
  };

  const openCreateSession = () => {
    const lastDate = sessions[sessions.length - 1]?.date || '2026-12-07';
    setCreatingSession(true);
    setEditingSession(null);
    setSDate(lastDate);
    setSDayLabel(getDayNameFromIso(lastDate));
    setSShiftGroup('Sesi 1');
    setSNumber(1);
    setSTimeRange('07.30 – 09.30');
    setSSubject('');
    setSGrade('X / XI / XII');
  };

  const openEditSession = (s: ExamSession) => {
    setCreatingSession(false);
    setEditingSession(s);
    setSDate(s.date);
    setSDayLabel(s.dayLabel);
    setSShiftGroup(s.shiftGroup || 'Sesi 1');
    setSNumber(s.sessionNumber);
    setSTimeRange(s.timeRange);
    setSSubject(s.subject);
    setSGrade(s.gradeLevel);
  };

  const handleSaveSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sSubject.trim()) return;
    const payload: Omit<ExamSession, 'id'> = {
      date: sDate,
      dayLabel: sDayLabel.trim() || getDayNameFromIso(sDate),
      shiftGroup: sShiftGroup.trim() || 'Sesi 1',
      sessionNumber: Math.max(1, Number(sNumber) || 1),
      timeRange: sTimeRange.trim() || '07.30 – 09.30',
      subject: sSubject.trim(),
      gradeLevel: sGrade.trim(),
    };
    if (creatingSession) {
      onAddSession(payload);
    } else if (editingSession) {
      onUpdateSession({ ...payload, id: editingSession.id });
    }
    setCreatingSession(false);
    setEditingSession(null);
  };

  const handleGenerateWeek = (e: React.FormEvent) => {
    e.preventDefault();
    const start = new Date(`${genStartDate}T00:00:00`);
    if (Number.isNaN(start.getTime())) return;

    const defaultTimes = ['07.30 – 09.30', '10.00 – 12.00', '13.00 – 14.30'];
    const shiftLabel = genShiftGroup.trim() || 'Sesi 1';
    const generated: Array<Omit<ExamSession, 'id'>> = [];
    let addedDays = 0;
    let cursor = new Date(start);

    while (addedDays < genDaysCount) {
      const dow = cursor.getDay();
      if (dow !== 0) {
        // Skip Sunday automatically
        const iso = cursor.toISOString().slice(0, 10);
        const dayName = INDONESIAN_DAYS[dow];
        for (let s = 1; s <= genSessionsPerDay; s++) {
          generated.push({
            date: iso,
            dayLabel: dayName,
            shiftGroup: shiftLabel,
            sessionNumber: s,
            timeRange: defaultTimes[s - 1] ?? `Jam ke-${s}`,
            subject: `Mata Pelajaran Hari ${addedDays + 1} (Jam ke-${s})`,
            gradeLevel: 'Semua Tingkat',
          });
        }
        addedDays++;
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    onBulkAddSessions(generated);
    setShowGenerator(false);
  };

  return (
    <div className="space-y-5">
      {/* Sub-navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setSubTab('sessions')}
            className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer ${
              subTab === 'sessions'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Jam & Sesi Ujian ({sessions.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('rooms')}
            className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer ${
              subTab === 'rooms'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ruang Ujian ({rooms.length})
          </button>
        </div>

        {subTab === 'sessions' ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowGenerator(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 cursor-pointer"
            >
              <CalendarPlus className="h-4 w-4" />
              Buat Paket Hari Ujian
            </button>
            <button
              type="button"
              onClick={openCreateSession}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Tambah Jam Ujian
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50">
              <span>Pengawas/Ruang:</span>
              <button
                type="button"
                onClick={() => onSetAllProctorsCount(1)}
                className="px-2 py-0.5 rounded bg-white border border-slate-200 font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer"
              >
                Semua 1
              </button>
              <button
                type="button"
                onClick={() => onSetAllProctorsCount(2)}
                className="px-2 py-0.5 rounded bg-white border border-slate-200 font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer"
              >
                Semua 2
              </button>
            </div>
            <button
              type="button"
              onClick={openCreateRoom}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Tambah Ruang Ujian
            </button>
          </div>
        )}
      </div>

      {/* Sessions Table */}
      {subTab === 'sessions' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {sessions.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-900">Belum ada slot jam ujian</p>
              <p className="text-xs text-slate-500">
                Klik &ldquo;Tambah Jam Ujian&rdquo; atau &ldquo;Buat Paket Hari Ujian&rdquo; untuk memulai.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700">
                    <th className="px-4 py-3 w-12 text-center">No</th>
                    <th className="px-4 py-3">Hari & Tanggal</th>
                    <th className="px-4 py-3">Sesi & Jam Ujian</th>
                    <th className="px-4 py-3">Mata Pelajaran Ujian</th>
                    <th className="px-4 py-3">Tingkat / Kelas</th>
                    <th className="px-4 py-3 text-right w-32">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sessions.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 text-center font-mono tabular-nums text-xs text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{s.dayLabel}</div>
                        <div className="text-xs font-mono tabular-nums text-slate-500">
                          {formatIndonesianDate(s.date)}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums text-xs text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-blue-700">
                            {s.shiftGroup || 'Sesi 1'}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="font-semibold text-slate-900">
                            Jam ke-{s.sessionNumber}
                          </span>
                        </div>
                        <div>{s.timeRange}</div>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">{s.subject}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{s.gradeLevel || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        {confirmDeleteSessionId === s.id ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteSession(s.id);
                                setConfirmDeleteSessionId(null);
                              }}
                              className="px-2 py-1 rounded bg-red-600 text-white text-xs font-semibold hover:bg-red-700 cursor-pointer"
                            >
                              Hapus
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteSessionId(null)}
                              className="px-2 py-1 rounded border border-slate-200 text-xs text-slate-600 hover:bg-slate-100 cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditSession(s)}
                              className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                              aria-label="Edit sesi"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteSessionId(s.id)}
                              className="p-1.5 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                              aria-label="Hapus sesi"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Rooms Table */}
      {subTab === 'rooms' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {rooms.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-900">Belum ada ruang ujian</p>
              <p className="text-xs text-slate-500">
                Tambahkan ruang ujian agar dapat dimasukkan ke matriks jadwal pengawas.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700">
                    <th className="px-4 py-3 w-24">Kode</th>
                    <th className="px-4 py-3">Nama Ruang</th>
                    <th className="px-4 py-3">Lokasi / Kelas</th>
                    <th className="px-4 py-3 text-right">Kapasitas</th>
                    <th className="px-4 py-3 text-center">Jumlah Pengawas</th>
                    <th className="px-4 py-3 text-right w-32">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rooms.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                        {r.code}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
                      <td className="px-4 py-3 text-slate-600">{r.location || '-'}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
                        {r.capacity} siswa
                      </td>
                      <td className="px-4 py-3 text-center font-mono tabular-nums">
                        <span className="font-semibold text-slate-900">
                          {r.proctorsRequired}
                        </span>{' '}
                        <span className="text-xs text-slate-500">orang</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {confirmDeleteRoomId === r.id ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteRoom(r.id);
                                setConfirmDeleteRoomId(null);
                              }}
                              className="px-2 py-1 rounded bg-red-600 text-white text-xs font-semibold hover:bg-red-700 cursor-pointer"
                            >
                              Hapus
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteRoomId(null)}
                              className="px-2 py-1 rounded border border-slate-200 text-xs text-slate-600 hover:bg-slate-100 cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditRoom(r)}
                              className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                              aria-label={`Edit ${r.name}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteRoomId(r.id)}
                              className="p-1.5 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                              aria-label={`Hapus ${r.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Room Modal */}
      {(creatingRoom || editingRoom) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 no-print">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-lg">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                {creatingRoom ? 'Tambah Ruang Ujian' : 'Edit Ruang Ujian'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setCreatingRoom(false);
                  setEditingRoom(null);
                }}
                className="p-1 rounded-md text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveRoom} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kode Ruang
                  </label>
                  <input
                    type="text"
                    required
                    value={rCode}
                    onChange={(e) => setRCode(e.target.value)}
                    placeholder="R-01"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Ruang
                  </label>
                  <input
                    type="text"
                    required
                    value={rName}
                    onChange={(e) => setRName(e.target.value)}
                    placeholder="Ruang 01"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lokasi / Kelas
                </label>
                <input
                  type="text"
                  value={rLocation}
                  onChange={(e) => setRLocation(e.target.value)}
                  placeholder="Contoh: Kelas X-A / Lab Komputer"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kapasitas Peserta
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={rCapacity}
                    onChange={(e) => setRCapacity(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pengawas per Ruang
                  </label>
                  <select
                    value={rProctors}
                    onChange={(e) => setRProctors(Number(e.target.value) as 1 | 2)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                  >
                    <option value={1}>1 Pengawas</option>
                    <option value={2}>2 Pengawas</option>
                  </select>
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setCreatingRoom(false);
                    setEditingRoom(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 cursor-pointer"
                >
                  Simpan Ruang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Session Modal */}
      {(creatingSession || editingSession) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 no-print">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-lg">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                {creatingSession ? 'Tambah Jam Ujian' : 'Edit Jam Ujian'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setCreatingSession(false);
                  setEditingSession(null);
                }}
                className="p-1 rounded-md text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveSession} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Ujian
                  </label>
                  <input
                    type="date"
                    required
                    value={sDate}
                    onChange={(e) => {
                      setSDate(e.target.value);
                      setSDayLabel(getDayNameFromIso(e.target.value));
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hari
                  </label>
                  <input
                    type="text"
                    required
                    value={sDayLabel}
                    onChange={(e) => setSDayLabel(e.target.value)}
                    placeholder="Senin"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sesi (Gelombang / Shift)
                </label>
                <input
                  type="text"
                  list="shift-group-options"
                  value={sShiftGroup}
                  onChange={(e) => setSShiftGroup(e.target.value)}
                  placeholder="Sesi 1"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                />
                <datalist id="shift-group-options">
                  <option value="Sesi 1" />
                  <option value="Sesi 2" />
                  <option value="Sesi 3" />
                  <option value="Sesi 1 (Pagi)" />
                  <option value="Sesi 2 (Siang)" />
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jam Ke-
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={sNumber}
                    onChange={(e) => setSNumber(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rentang Waktu
                  </label>
                  <input
                    type="text"
                    required
                    value={sTimeRange}
                    onChange={(e) => setSTimeRange(e.target.value)}
                    placeholder="07.30 – 09.30"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mata Pelajaran yang Diujikan
                </label>
                <input
                  type="text"
                  required
                  value={sSubject}
                  onChange={(e) => setSSubject(e.target.value)}
                  placeholder="Contoh: Matematika atau Fisika / Ekonomi"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tingkat / Kelas
                </label>
                <input
                  type="text"
                  value={sGrade}
                  onChange={(e) => setSGrade(e.target.value)}
                  placeholder="X / XI / XII"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setCreatingSession(false);
                    setEditingSession(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 cursor-pointer"
                >
                  Simpan Jam Ujian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Exam Week Generator Modal */}
      {showGenerator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 no-print">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-lg">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Buat Paket Hari & Jam Ujian
              </h3>
              <button
                type="button"
                onClick={() => setShowGenerator(false)}
                className="p-1 rounded-md text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleGenerateWeek} className="p-5 space-y-4">
              <p className="text-xs text-slate-600">
                Membuat slot tanggal & jam ujian (Jam ke-1, Jam ke-2, dst.) secara otomatis (hari Minggu dilewati).
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Mulai Ujian
                  </label>
                  <input
                    type="date"
                    required
                    value={genStartDate}
                    onChange={(e) => setGenStartDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Sesi (Shift)
                  </label>
                  <input
                    type="text"
                    value={genShiftGroup}
                    onChange={(e) => setGenShiftGroup(e.target.value)}
                    placeholder="Sesi 1"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jumlah Hari Ujian
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={14}
                    value={genDaysCount}
                    onChange={(e) => setGenDaysCount(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jam Ujian per Hari
                  </label>
                  <select
                    value={genSessionsPerDay}
                    onChange={(e) => setGenSessionsPerDay(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                  >
                    <option value={1}>1 Jam / hari (Jam ke-1)</option>
                    <option value={2}>2 Jam / hari (Jam ke-1 & 2)</option>
                    <option value={3}>3 Jam / hari (Jam ke-1 s.d. 3)</option>
                  </select>
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowGenerator(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 cursor-pointer"
                >
                  Tambahkan {genDaysCount * genSessionsPerDay} Slot Jam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
