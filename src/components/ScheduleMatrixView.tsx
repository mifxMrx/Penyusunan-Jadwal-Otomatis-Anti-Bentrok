import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarRange,
  CheckCircle2,
  Layers,
  Lock,
  Printer,
  RefreshCw,
  Search,
  Shuffle,
  Trash2,
  Unlock,
  X,
} from 'lucide-react';
import {
  Assignment,
  ConflictItem,
  ExamSession,
  Room,
  SchedulerSettings,
  Teacher,
} from '../types/schedule';
import { getTeacherColorHex, hexToRgba } from '../utils/colors';
import {
  cellKey,
  ConflictAnalysis,
  formatIndonesianDate,
  getCandidateStatusesForCell,
} from '../utils/scheduler';

export interface DayRangeConfig {
  startDate: string;
  endDate: string;
  activeWeekdays: number[]; // 0=Minggu .. 6=Sabtu
  sessionsPerDay: number;
}

export interface ShiftModeConfig {
  shifts: Array<{ name: string; jam1Time: string; jam2Time: string }>;
  hoursPerShift: number;
  maxShiftsPerDayPerTeacher: number;
}

interface ScheduleMatrixViewProps {
  teachers: Teacher[];
  rooms: Room[];
  allSessions: ExamSession[];
  sessions: ExamSession[];
  assignments: Assignment[];
  settings: SchedulerSettings;
  analysis: ConflictAnalysis;
  onUpdateSettings: (next: SchedulerSettings) => void;
  onApplyDayRange: (config: DayRangeConfig) => void;
  onApplyShiftConfig: (config: ShiftModeConfig) => void;
  onAutoGenerate: (randomize: boolean) => void;
  onClearUnlocked: () => void;
  onAssignCell: (
    sessionId: string,
    roomId: string,
    proctorSlot: number,
    teacherId: string | null
  ) => void;
  onToggleLockCell: (sessionId: string, roomId: string, proctorSlot: number) => void;
  onUnlockAll: () => void;
  onGoToPrint: () => void;
}

interface EditingCell {
  sessionId: string;
  roomId: string;
  proctorSlot: number;
}

const WEEKDAY_OPTIONS = [
  { day: 1, short: 'Sen', full: 'Senin' },
  { day: 2, short: 'Sel', full: 'Selasa' },
  { day: 3, short: 'Rab', full: 'Rabu' },
  { day: 4, short: 'Kam', full: 'Kamis' },
  { day: 5, short: 'Jum', full: 'Jumat' },
  { day: 6, short: 'Sab', full: 'Sabtu' },
  { day: 0, short: 'Min', full: 'Minggu' },
];

export const ScheduleMatrixView: React.FC<ScheduleMatrixViewProps> = ({
  teachers,
  rooms,
  allSessions,
  sessions,
  assignments,
  settings,
  analysis,
  onUpdateSettings,
  onApplyDayRange,
  onApplyShiftConfig,
  onAutoGenerate,
  onClearUnlocked,
  onAssignCell,
  onToggleLockCell,
  onUnlockAll,
  onGoToPrint,
}) => {
  const [selectedDay, setSelectedDay] = useState<string>('ALL');
  const [selectedShift, setSelectedShift] = useState<string>('ALL');
  const [highlightTeacherId, setHighlightTeacherId] = useState<string>('');
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [pickerQuery, setPickerQuery] = useState<string>('');
  const [showConflictDetails, setShowConflictDetails] = useState<boolean>(false);

  // Day Range Setting Modal
  const [showDaySettingsModal, setShowDaySettingsModal] = useState<boolean>(false);
  const [rangeStart, setRangeStart] = useState<string>(
    allSessions[0]?.date || '2026-11-30'
  );
  const [rangeEnd, setRangeEnd] = useState<string>(
    allSessions[allSessions.length - 1]?.date || '2026-12-04'
  );
  const [activeWeekdays, setActiveWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [rangeSessionsPerDay, setRangeSessionsPerDay] = useState<number>(2);

  // Shift (Sesi Gelombang) Modal
  const [showShiftModal, setShowShiftModal] = useState<boolean>(false);
  const [shiftCount, setShiftCount] = useState<number>(1);
  const [shiftNames, setShiftNames] = useState<string[]>(['Sesi 1', 'Sesi 2', 'Sesi 3']);
  const [shiftJam1Times, setShiftJam1Times] = useState<string[]>([
    '07.30 – 09.00',
    '10.30 – 12.00',
    '13.30 – 15.00',
  ]);
  const [shiftJam2Times, setShiftJam2Times] = useState<string[]>([
    '09.15 – 10.15',
    '12.15 – 13.15',
    '15.15 – 16.15',
  ]);
  const [shiftHoursPerShift, setShiftHoursPerShift] = useState<number>(2);
  const [modalMaxShiftsPerDay, setModalMaxShiftsPerDay] = useState<number>(
    settings.maxShiftsPerDayPerTeacher ?? 0
  );

  const teacherMap = useMemo(() => new Map(teachers.map((t) => [t.id, t])), [teachers]);
  const teacherIndexMap = useMemo(() => new Map(teachers.map((t, idx) => [t.id, idx])), [teachers]);

  const assignmentMap = useMemo(() => {
    const map = new Map<string, Assignment>();
    assignments.forEach((a) => map.set(cellKey(a.sessionId, a.roomId, a.proctorSlot), a));
    return map;
  }, [assignments]);

  // All distinct days across master sessions (used for "Sampai Hari Tertentu" limit selector)
  const allUniqueDays = useMemo(() => {
    const seen = new Map<string, { date: string; dayLabel: string }>();
    allSessions.forEach((s) => {
      if (!seen.has(s.date)) {
        seen.set(s.date, { date: s.date, dayLabel: s.dayLabel });
      }
    });
    return Array.from(seen.values());
  }, [allSessions]);

  // Active unique days (after scheduleEndDate filter)
  const uniqueDays = useMemo(() => {
    const seen = new Map<string, string>();
    sessions.forEach((s) => {
      if (!seen.has(s.date)) {
        seen.set(s.date, `${s.dayLabel}, ${formatIndonesianDate(s.date, true)}`);
      }
    });
    return Array.from(seen.entries());
  }, [sessions]);

  const uniqueShifts = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach((s) => set.add(s.shiftGroup || 'Sesi 1'));
    return Array.from(set);
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (selectedDay !== 'ALL' && s.date !== selectedDay) return false;
      if (selectedShift !== 'ALL' && (s.shiftGroup || 'Sesi 1') !== selectedShift) return false;
      return true;
    });
  }, [sessions, selectedDay, selectedShift]);

  const lockedCount = useMemo(
    () => assignments.filter((a) => a.locked && a.teacherId).length,
    [assignments]
  );

  const totalRequiredSlots = useMemo(
    () => sessions.length * rooms.reduce((acc, r) => acc + r.proctorsRequired, 0),
    [sessions, rooms]
  );

  const filledSlots = totalRequiredSlots - analysis.emptyCount;

  const previewDayCount = useMemo(() => {
    if (!rangeStart || !rangeEnd || rangeEnd < rangeStart) return 0;
    const start = new Date(`${rangeStart}T00:00:00`);
    const end = new Date(`${rangeEnd}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    let count = 0;
    const cursor = new Date(start);
    let safety = 0;
    while (cursor <= end && safety < 60) {
      if (activeWeekdays.includes(cursor.getDay())) count++;
      cursor.setDate(cursor.getDate() + 1);
      safety++;
    }
    return count;
  }, [rangeStart, rangeEnd, activeWeekdays]);

  const openDaySettings = () => {
    const firstDate = allSessions[0]?.date || '2026-11-30';
    const lastDate =
      settings.scheduleEndDate ||
      allSessions[allSessions.length - 1]?.date ||
      '2026-12-04';
    const hasSaturday = allSessions.some(
      (s) => new Date(`${s.date}T00:00:00`).getDay() === 6
    );
    const maxSesi = allSessions.reduce((m, s) => Math.max(m, s.sessionNumber), 2);
    setRangeStart(firstDate);
    setRangeEnd(lastDate);
    setActiveWeekdays(hasSaturday ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5]);
    setRangeSessionsPerDay(Math.min(3, Math.max(1, maxSesi)));
    setShowDaySettingsModal(true);
  };

  const applyQuickEndDayOffset = (activeDaysTarget: number) => {
    const start = new Date(`${rangeStart}T00:00:00`);
    if (Number.isNaN(start.getTime()) || activeWeekdays.length === 0) return;
    const cursor = new Date(start);
    let counted = 0;
    let safety = 0;
    while (safety < 60) {
      if (activeWeekdays.includes(cursor.getDay())) {
        counted++;
        if (counted >= activeDaysTarget) {
          setRangeEnd(cursor.toISOString().slice(0, 10));
          return;
        }
      }
      cursor.setDate(cursor.getDate() + 1);
      safety++;
    }
  };

  const toggleWeekday = (day: number) => {
    setActiveWeekdays((prev) =>
      prev.includes(day)
        ? prev.length > 1
          ? prev.filter((d) => d !== day)
          : prev
        : [...prev, day]
    );
  };

  const openShiftModal = () => {
    const existingShifts = Array.from(
      new Set(allSessions.map((s) => s.shiftGroup || 'Sesi 1'))
    );
    const maxJam = allSessions.reduce((m, s) => Math.max(m, s.sessionNumber), 2);
    setShiftCount(Math.min(3, Math.max(1, existingShifts.length)));
    setShiftNames([
      existingShifts[0] || 'Sesi 1 (Pagi)',
      existingShifts[1] || 'Sesi 2 (Siang)',
      existingShifts[2] || 'Sesi 3 (Sore)',
    ]);
    setShiftHoursPerShift(Math.min(2, Math.max(1, maxJam)));
    setModalMaxShiftsPerDay(settings.maxShiftsPerDayPerTeacher ?? 0);
    setShowShiftModal(true);
  };

  const handleSaveShiftConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const shifts = Array.from({ length: shiftCount }).map((_, idx) => ({
      name: shiftNames[idx]?.trim() || `Sesi ${idx + 1}`,
      jam1Time: shiftJam1Times[idx]?.trim() || '07.30 – 09.30',
      jam2Time: shiftJam2Times[idx]?.trim() || '10.00 – 12.00',
    }));
    onApplyShiftConfig({
      shifts,
      hoursPerShift: shiftHoursPerShift,
      maxShiftsPerDayPerTeacher: modalMaxShiftsPerDay,
    });
    setSelectedShift('ALL');
    setShowShiftModal(false);
  };

  const handleSaveDayRange = (e: React.FormEvent) => {
    e.preventDefault();
    if (previewDayCount <= 0) return;
    onApplyDayRange({
      startDate: rangeStart,
      endDate: rangeEnd,
      activeWeekdays,
      sessionsPerDay: rangeSessionsPerDay,
    });
    setSelectedDay('ALL');
    setShowDaySettingsModal(false);
  };

  const pickerData = useMemo(() => {
    if (!editingCell) return null;
    const session = sessions.find((s) => s.id === editingCell.sessionId);
    const room = rooms.find((r) => r.id === editingCell.roomId);
    const currentAssign = assignmentMap.get(
      cellKey(editingCell.sessionId, editingCell.roomId, editingCell.proctorSlot)
    );
    const candidates = getCandidateStatusesForCell(
      teachers,
      sessions,
      rooms,
      assignments,
      editingCell.sessionId,
      editingCell.roomId,
      editingCell.proctorSlot,
      settings
    ).filter((c) => {
      if (!pickerQuery.trim()) return true;
      const q = pickerQuery.toLowerCase();
      return (
        c.teacher.name.toLowerCase().includes(q) ||
        c.teacher.code.toLowerCase().includes(q) ||
        c.teacher.subjects.some((sub) => sub.toLowerCase().includes(q))
      );
    });

    return { session, room, currentAssign, candidates };
  }, [editingCell, sessions, rooms, assignmentMap, teachers, assignments, settings, pickerQuery]);

  const activeTeachers = useMemo(() => teachers.filter((t) => t.active), [teachers]);

  const renderSlotChip = (session: ExamSession, room: Room, slot: number) => {
    const key = cellKey(session.id, room.id, slot);
    const assign = assignmentMap.get(key);
    const teacher = assign?.teacherId ? teacherMap.get(assign.teacherId) : null;
    const teacherColor = teacher
      ? getTeacherColorHex(teacher, teacherIndexMap.get(teacher.id) ?? 0)
      : null;

    const cellIssues: ConflictItem[] = analysis.cellConflicts[key] ?? [];
    const hasError = cellIssues.some((c) => c.severity === 'error');
    const hasWarning = cellIssues.some(
      (c) => c.severity === 'warning' && c.type !== 'EMPTY_SLOT'
    );
    const isHighlighted = Boolean(highlightTeacherId && teacher?.id === highlightTeacherId);
    const isDimmed = Boolean(highlightTeacherId && teacher?.id !== highlightTeacherId);

    const dynamicStyle: React.CSSProperties | undefined =
      teacher && teacherColor && !hasError && !hasWarning
        ? {
            backgroundColor: hexToRgba(teacherColor, isHighlighted ? 0.2 : 0.1),
            borderColor: hexToRgba(teacherColor, isHighlighted ? 0.9 : 0.35),
          }
        : undefined;

    return (
      <div
        key={key}
        style={dynamicStyle}
        className={`group relative flex items-center justify-between gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-colors cursor-pointer ${
          hasError
            ? 'border-red-400 bg-red-50 text-red-900 hover:bg-red-100/80'
            : hasWarning
            ? 'border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100/80'
            : isHighlighted
            ? 'ring-1 ring-slate-900/20 text-slate-950'
            : teacher
            ? 'text-slate-900 hover:brightness-95'
            : 'border-dashed border-slate-300 bg-slate-50/70 text-slate-400 hover:border-blue-400 hover:text-slate-600'
        } ${isDimmed ? 'opacity-35' : ''}`}
        onClick={() => {
          setPickerQuery('');
          setEditingCell({ sessionId: session.id, roomId: room.id, proctorSlot: slot });
        }}
        title={
          cellIssues.length > 0
            ? cellIssues.map((c) => c.message).join(' | ')
            : teacher
            ? `${teacher.code} — ${teacher.name} (Klik untuk ubah)`
            : 'Klik untuk pilih pengawas'
        }
      >
        <div className="min-w-0 flex-1">
          {teacher && teacherColor ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="h-2.5 w-2.5 rounded-[3px] shrink-0"
                style={{ backgroundColor: teacherColor }}
              />
              <span
                className="font-mono font-bold shrink-0 text-[11px]"
                style={{ color: hasError ? '#991b1b' : teacherColor }}
              >
                {teacher.code}
              </span>
              <span className="truncate text-[11.5px] font-medium text-slate-900">
                {teacher.name.split(',')[0]}
              </span>
            </div>
          ) : (
            <span className="text-[11px]">
              {room.proctorsRequired > 1 ? `P${slot + 1} Kosong` : 'Pilih pengawas'}
            </span>
          )}
        </div>

        {teacher && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleLockCell(session.id, room.id, slot);
            }}
            className={`p-0.5 rounded transition-opacity shrink-0 ${
              assign?.locked
                ? 'text-slate-900 opacity-100'
                : 'text-slate-500 opacity-0 group-hover:opacity-100 hover:text-slate-900'
            }`}
            title={
              assign?.locked
                ? 'Terkunci (klik untuk buka kunci)'
                : 'Kunci slot ini agar tidak berubah saat susun otomatis'
            }
            aria-label={assign?.locked ? 'Buka kunci slot' : 'Kunci slot'}
          >
            {assign?.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Primary Action & Rules Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onAutoGenerate(false)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              Susun Otomatis Anti-Bentrok
            </button>
            <button
              type="button"
              onClick={() => onAutoGenerate(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Shuffle className="h-4 w-4" />
              Acak Ulang
            </button>
            <button
              type="button"
              onClick={openDaySettings}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <CalendarRange className="h-4 w-4" />
              Atur Rentang Hari
            </button>
            <button
              type="button"
              onClick={openShiftModal}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Layers className="h-4 w-4" />
              Atur Sesi (Shift)
            </button>
            <button
              type="button"
              onClick={onClearUnlocked}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm font-medium hover:bg-slate-50 hover:text-red-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Kosongkan semua slot yang tidak dikunci"
            >
              <Trash2 className="h-4 w-4" />
              Kosongkan
            </button>
            {lockedCount > 0 && (
              <button
                type="button"
                onClick={onUnlockAll}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Unlock className="h-4 w-4" />
                Buka {lockedCount} Kunci
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onGoToPrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            Pratinjau & PDF A4
          </button>
        </div>

        {/* Rule Constraints & Day Settings */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-sm">
          <div className="flex flex-wrap items-center gap-5">
            <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={settings.avoidOwnSubject}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, avoidOwnSubject: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              <span>Hindari mengawas mapel sendiri</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={settings.balanceLoad}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, balanceLoad: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              <span>Pemerataan beban tugas</span>
            </label>

            <div className="inline-flex items-center gap-2 text-slate-700">
              <label htmlFor="max-per-day" className="whitespace-nowrap">
                Maks Jam/hari:
              </label>
              <select
                id="max-per-day"
                value={settings.maxPerDayPerTeacher}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    maxPerDayPerTeacher: Number(e.target.value),
                  })
                }
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-sm font-mono tabular-nums text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                <option value={1}>1 jam</option>
                <option value={2}>2 jam</option>
                <option value={3}>3 jam</option>
                <option value={0}>Bebas</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Active Schedule Day Cutoff ("Sampai Hari Tertentu") */}
            <div className="inline-flex items-center gap-2">
              <label htmlFor="end-day-limit" className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                Sampai Hari:
              </label>
              <select
                id="end-day-limit"
                value={settings.scheduleEndDate ?? 'ALL'}
                onChange={(e) => {
                  const val = e.target.value === 'ALL' ? null : e.target.value;
                  onUpdateSettings({ ...settings, scheduleEndDate: val });
                  setSelectedDay('ALL');
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 focus:border-blue-600 focus:outline-none"
              >
                <option value="ALL">
                  Semua ({allUniqueDays.length} Hari)
                </option>
                {allUniqueDays.map((d, idx) => (
                  <option key={d.date} value={d.date}>
                    Hari ke-{idx + 1} · {d.dayLabel}, {formatIndonesianDate(d.date, true)}
                  </option>
                ))}
              </select>
            </div>

            {uniqueShifts.length > 1 && (
              <select
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value)}
                aria-label="Filter Sesi Ujian"
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 focus:border-blue-600 focus:outline-none"
              >
                <option value="ALL">Semua Sesi ({uniqueShifts.length})</option>
                {uniqueShifts.map((sh) => (
                  <option key={sh} value={sh}>
                    {sh}
                  </option>
                ))}
              </select>
            )}

            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              aria-label="Filter Tampilan Hari"
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 focus:border-blue-600 focus:outline-none"
            >
              <option value="ALL">Tampilkan Semua ({sessions.length} Jam)</option>
              {uniqueDays.map(([date, label]) => (
                <option key={date} value={date}>
                  Hanya {label}
                </option>
              ))}
            </select>

            <select
              value={highlightTeacherId}
              onChange={(e) => setHighlightTeacherId(e.target.value)}
              aria-label="Sorot Pengawas"
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 focus:border-blue-600 focus:outline-none max-w-[220px]"
            >
              <option value="">Sorot Pengawas (Semua)</option>
              {activeTeachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.code} — {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Validation Status Summary Strip */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
          analysis.errorCount > 0
            ? 'border-red-200 bg-red-50/80 text-red-900'
            : analysis.warningCount > 0 || analysis.emptyCount > 0
            ? 'border-amber-200 bg-amber-50/80 text-amber-900'
            : 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {analysis.errorCount > 0 || analysis.warningCount > 0 ? (
            <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
          )}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold">
              {analysis.errorCount === 0
                ? 'Jadwal Anti-Bentrok Terverifikasi'
                : `${analysis.errorCount} Bentrok Terdeteksi`}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {filledSlots}/{totalRequiredSlots} slot terisi
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {uniqueDays.length} hari aktif
            </span>
            {analysis.warningCount > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>{analysis.warningCount} catatan aturan lunak</span>
              </>
            )}
          </div>
        </div>

        {analysis.conflicts.length > 0 && (
          <button
            type="button"
            onClick={() => setShowConflictDetails((v) => !v)}
            className="text-xs font-semibold underline underline-offset-2 hover:opacity-80 cursor-pointer"
          >
            {showConflictDetails
              ? 'Sembunyikan Rincian'
              : `Lihat ${analysis.conflicts.length} Rincian`}
          </button>
        )}
      </div>

      {/* Expandable Conflict / Empty Slot Details */}
      {showConflictDetails && analysis.conflicts.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">
              Daftar Peringatan & Slot Belum Terisi
            </span>
            <button
              type="button"
              onClick={() => setShowConflictDetails(false)}
              className="text-xs text-slate-500 hover:text-slate-900"
            >
              Tutup
            </button>
          </div>
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
            {analysis.conflicts.map((item) => (
              <div
                key={item.id}
                className="px-4 py-2.5 flex items-center justify-between gap-4 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`font-semibold shrink-0 ${
                      item.severity === 'error'
                        ? 'text-red-700'
                        : item.type === 'EMPTY_SLOT'
                        ? 'text-slate-600'
                        : 'text-amber-700'
                    }`}
                  >
                    {item.severity === 'error'
                      ? 'BENTROK'
                      : item.type === 'EMPTY_SLOT'
                      ? 'KOSONG'
                      : 'CATATAN'}
                  </span>
                  <span className="text-slate-700 truncate">{item.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPickerQuery('');
                    setEditingCell({
                      sessionId: item.sessionId,
                      roomId: item.roomId,
                      proctorSlot: item.proctorSlot,
                    });
                  }}
                  className="px-2.5 py-1 rounded border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 shrink-0 cursor-pointer"
                >
                  Ubah Slot
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Schedule Matrix Grid */}
      {sessions.length === 0 || rooms.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2">
          <p className="text-base font-semibold text-slate-900">
            Data Ruang atau Sesi Ujian Belum Lengkap
          </p>
          <p className="text-sm text-slate-500">
            Tambahkan minimal 1 ruang ujian dan 1 sesi ujian atau klik &ldquo;Atur Rentang Hari&rdquo; untuk memulai.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700">
                  <th className="sticky left-0 z-20 bg-slate-50 px-4 py-3 border-r border-slate-200 min-w-[195px]">
                    Hari, Tanggal & Jam
                  </th>
                  <th className="px-3.5 py-3 border-r border-slate-200 min-w-[165px]">
                    Mata Pelajaran
                  </th>
                  {rooms.map((room) => (
                    <th
                      key={room.id}
                      className="px-3 py-3 border-r last:border-r-0 border-slate-200 min-w-[155px]"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono font-semibold text-slate-900">
                          {room.code}
                        </span>
                        <span className="text-[11px] font-normal text-slate-500">
                          {room.proctorsRequired} pengawas
                        </span>
                      </div>
                      <div className="text-[11px] font-normal text-slate-500 truncate">
                        {room.location || room.name}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-slate-50/40">
                    <td className="sticky left-0 z-10 bg-white px-4 py-2.5 border-r border-slate-200 align-top">
                      <div className="font-semibold text-slate-900 text-xs">
                        {session.dayLabel}, {formatIndonesianDate(session.date, true)}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-600 font-mono tabular-nums">
                        <span className="font-semibold text-blue-800">
                          Jam ke-{session.sessionNumber}
                        </span>{' '}
                        · {session.timeRange}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {session.shiftGroup || 'Sesi 1'}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 border-r border-slate-200 align-top">
                      <div className="font-medium text-slate-900 text-xs leading-snug">
                        {session.subject}
                      </div>
                      {session.gradeLevel && (
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          Kelas {session.gradeLevel}
                        </div>
                      )}
                    </td>
                    {rooms.map((room) => (
                      <td
                        key={room.id}
                        className="px-2.5 py-2 border-r last:border-r-0 border-slate-200 align-top space-y-1.5"
                      >
                        {Array.from({ length: room.proctorsRequired }).map((_, slotIdx) =>
                          renderSlotChip(session, room, slotIdx)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Teacher Workload Distribution with Color Legend */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Legenda Warna & Distribusi Beban Mengawas ({activeTeachers.length} Pengawas Aktif)
            </h2>
            <p className="text-xs text-slate-500">
              Setiap guru memiliki warna khusus. Klik nama pengawas untuk menyorot seluruh jadwalnya di tabel.
            </p>
          </div>
          {highlightTeacherId && (
            <button
              type="button"
              onClick={() => setHighlightTeacherId('')}
              className="text-xs font-medium text-blue-700 hover:underline cursor-pointer"
            >
              Reset Sorotan
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-2">
          {activeTeachers.map((t) => {
            const count = analysis.teacherTotalCounts[t.id] ?? 0;
            const isSelected = highlightTeacherId === t.id;
            const overLimit = t.maxSessions !== null && count > t.maxSessions;
            const tHex = getTeacherColorHex(t, teacherIndexMap.get(t.id) ?? 0);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() =>
                  setHighlightTeacherId((prev) => (prev === t.id ? '' : t.id))
                }
                style={{
                  backgroundColor: isSelected ? hexToRgba(tHex, 0.16) : hexToRgba(tHex, 0.06),
                  borderColor: isSelected ? tHex : hexToRgba(tHex, 0.3),
                }}
                className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors hover:brightness-95 cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-[3px] shrink-0"
                      style={{ backgroundColor: tHex }}
                    />
                    <span
                      className="font-mono text-xs font-bold"
                      style={{ color: tHex }}
                    >
                      {t.code}
                    </span>
                    <span className="text-xs font-medium text-slate-900 truncate">
                      {t.name.split(',')[0]}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate pl-4">
                    {t.subjects.join(', ') || 'Umum'}
                  </div>
                </div>
                <span
                  className={`font-mono tabular-nums text-xs font-semibold shrink-0 ${
                    overLimit ? 'text-amber-700' : 'text-slate-700'
                  }`}
                >
                  {count}x
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Day Range Configuration Modal ("Setingan Hari Sampai Hari Tertentu") */}
      {showDaySettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 no-print">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-lg">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Pengaturan Rentang Hari Ujian
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Atur tanggal mulai sampai hari/tanggal akhir ujian serta hari aktif sekolah.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDaySettingsModal(false)}
                className="p-1 rounded-md text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDayRange} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mulai Tanggal
                  </label>
                  <input
                    type="date"
                    required
                    value={rangeStart}
                    onChange={(e) => setRangeStart(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sampai Tanggal / Hari
                  </label>
                  <input
                    type="date"
                    required
                    min={rangeStart}
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-700 mb-1.5">
                  Pilih Cepat Lama Pelaksanaan Ujian
                </div>
                <div className="flex flex-wrap gap-2">
                  {[3, 4, 5, 6, 8, 10].map((dCount) => (
                    <button
                      key={dCount}
                      type="button"
                      onClick={() => applyQuickEndDayOffset(dCount)}
                      className="px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-800 cursor-pointer"
                    >
                      {dCount} Hari Ujian
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-700 mb-1.5">
                  Hari Sekolah Aktif
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAY_OPTIONS.map((opt) => {
                    const checked = activeWeekdays.includes(opt.day);
                    return (
                      <button
                        key={opt.day}
                        type="button"
                        onClick={() => toggleWeekday(opt.day)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                          checked
                            ? 'border-blue-600 bg-blue-50 text-blue-800'
                            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {opt.full}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jumlah Jam Ujian per Hari
                </label>
                <select
                  value={rangeSessionsPerDay}
                  onChange={(e) => setRangeSessionsPerDay(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                >
                  <option value={1}>1 Jam / hari (Jam ke-1: 07.30 – 09.30)</option>
                  <option value={2}>2 Jam / hari (Jam ke-1 & Jam ke-2)</option>
                  <option value={3}>3 Jam / hari (Jam ke-1, Jam ke-2 & Jam ke-3)</option>
                </select>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700">
                {previewDayCount > 0 ? (
                  <span>
                    Akan dijadwalkan <strong className="font-mono">{previewDayCount} hari</strong> (
                    <strong className="font-mono">{previewDayCount * rangeSessionsPerDay} jam</strong>) dari{' '}
                    <strong>{formatIndonesianDate(rangeStart, true)}</strong> sampai{' '}
                    <strong>{formatIndonesianDate(rangeEnd, true)}</strong>. Nama mapel yang sudah ada pada tanggal yang sama akan tetap dipertahankan.
                  </span>
                ) : (
                  <span className="text-red-700 font-medium">
                    Tanggal akhir harus sama atau setelah tanggal mulai.
                  </span>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowDaySettingsModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={previewDayCount <= 0}
                  className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 cursor-pointer"
                >
                  Terapkan & Susun Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shift / Sesi Gelombang Configuration Modal */}
      {showShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 no-print">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-lg">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Pengaturan Sesi Ujian (Shift / Gelombang)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Fitur khusus untuk ujian bergelombang (misal Sesi 1 Pagi & Sesi 2 Siang), terpisah dari Jam ke-1 dan Jam ke-2.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowShiftModal(false)}
                className="p-1 rounded-md text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveShiftConfig} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mode Sesi per Hari
                  </label>
                  <select
                    value={shiftCount}
                    onChange={(e) => setShiftCount(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                  >
                    <option value={1}>1 Sesi (Reguler)</option>
                    <option value={2}>2 Sesi (Sesi 1 & Sesi 2)</option>
                    <option value={3}>3 Sesi (Sesi 1, Sesi 2 & Sesi 3)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jumlah Jam dalam Setiap Sesi
                  </label>
                  <select
                    value={shiftHoursPerShift}
                    onChange={(e) => setShiftHoursPerShift(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                  >
                    <option value={1}>1 Jam (Jam ke-1 saja)</option>
                    <option value={2}>2 Jam (Jam ke-1 & Jam ke-2)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="text-xs font-semibold text-slate-700">
                  Nama Sesi & Waktu Jam ke-1 / Jam ke-2
                </div>
                {Array.from({ length: shiftCount }).map((_, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 grid grid-cols-1 sm:grid-cols-3 gap-3"
                  >
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Nama Sesi {idx + 1}
                      </label>
                      <input
                        type="text"
                        required
                        value={shiftNames[idx] ?? `Sesi ${idx + 1}`}
                        onChange={(e) => {
                          const next = [...shiftNames];
                          next[idx] = e.target.value;
                          setShiftNames(next);
                        }}
                        className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Waktu Jam ke-1
                      </label>
                      <input
                        type="text"
                        required
                        value={shiftJam1Times[idx] ?? '07.30 – 09.30'}
                        onChange={(e) => {
                          const next = [...shiftJam1Times];
                          next[idx] = e.target.value;
                          setShiftJam1Times(next);
                        }}
                        className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    {shiftHoursPerShift >= 2 && (
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Waktu Jam ke-2
                        </label>
                        <input
                          type="text"
                          required
                          value={shiftJam2Times[idx] ?? '10.00 – 12.00'}
                          onChange={(e) => {
                            const next = [...shiftJam2Times];
                            next[idx] = e.target.value;
                            setShiftJam2Times(next);
                          }}
                          className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono focus:border-blue-600 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Aturan Batas Sesi per Hari untuk Setiap Guru
                </label>
                <select
                  value={modalMaxShiftsPerDay}
                  onChange={(e) => setModalMaxShiftsPerDay(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                >
                  <option value={0}>Bebas (Guru boleh mengawas di beberapa sesi pada hari yang sama)</option>
                  <option value={1}>Maksimal 1 Sesi per hari (Guru hanya menjaga 1 shift di hari tsb)</option>
                  <option value={2}>Maksimal 2 Sesi per hari</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowShiftModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 cursor-pointer"
                >
                  Terapkan Sesi & Susun Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Smart Teacher Picker Modal */}
      {editingCell && pickerData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 no-print">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-lg">
            <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Pilih Pengawas · {pickerData.room?.code} (Pengawas {editingCell.proctorSlot + 1})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {pickerData.session?.dayLabel},{' '}
                  {formatIndonesianDate(pickerData.session?.date ?? '', true)} ·{' '}
                  {pickerData.session?.shiftGroup || 'Sesi 1'} · Jam ke-
                  {pickerData.session?.sessionNumber} ({pickerData.session?.timeRange}) · Mapel:{' '}
                  <span className="font-medium text-slate-700">
                    {pickerData.session?.subject}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCell(null)}
                className="p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                aria-label="Tutup dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={pickerQuery}
                  onChange={(e) => setPickerQuery(e.target.value)}
                  placeholder="Cari kode, nama guru, atau mata pelajaran..."
                  autoFocus
                  className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>
              {pickerData.currentAssign?.teacherId && (
                <button
                  type="button"
                  onClick={() => {
                    onAssignCell(
                      editingCell.sessionId,
                      editingCell.roomId,
                      editingCell.proctorSlot,
                      null
                    );
                    setEditingCell(null);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-50 whitespace-nowrap cursor-pointer"
                >
                  Kosongkan
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {pickerData.candidates.map((cand) => {
                const isCurrent = pickerData.currentAssign?.teacherId === cand.teacher.id;
                const candColor = getTeacherColorHex(
                  cand.teacher,
                  teacherIndexMap.get(cand.teacher.id) ?? 0
                );
                return (
                  <button
                    key={cand.teacher.id}
                    type="button"
                    onClick={() => {
                      onAssignCell(
                        editingCell.sessionId,
                        editingCell.roomId,
                        editingCell.proctorSlot,
                        cand.teacher.id
                      );
                      setEditingCell(null);
                    }}
                    className={`w-full px-5 py-3 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-blue-50'
                        : cand.eligibleStrict
                        ? 'hover:bg-slate-50'
                        : 'bg-slate-50/40 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-[3px] shrink-0"
                          style={{ backgroundColor: candColor }}
                        />
                        <span
                          className="font-mono text-xs font-bold"
                          style={{ color: candColor }}
                        >
                          {cand.teacher.code}
                        </span>
                        <span className="text-sm font-medium text-slate-900 truncate">
                          {cand.teacher.name}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2 pl-4.5">
                        <span>{cand.teacher.subjects.join(', ') || 'Umum'}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          Total saat ini: {cand.currentTotal}x
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      {cand.reasons.length === 0 ? (
                        <span className="text-xs font-semibold text-emerald-700">
                          Tersedia
                        </span>
                      ) : !cand.eligibleHard ? (
                        <span className="text-xs font-semibold text-red-700">
                          {cand.reasons[0]}
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-amber-700">
                          {cand.reasons[0]}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
