import { useEffect, useMemo, useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { DayRangeConfig, ScheduleMatrixView, ShiftModeConfig } from './components/ScheduleMatrixView';
import { TeachersView } from './components/TeachersView';
import { RoomsAndSessionsView } from './components/RoomsAndSessionsView';
import { PrintPreviewA4View } from './components/PrintPreviewA4View';
import { SchoolSettingsView } from './components/SchoolSettingsView';
import { DEFAULT_APP_STATE } from './data/defaultData';
import {
  ActiveTab,
  AppState,
  ExamSession,
  PrintConfig,
  Room,
  SchedulerSettings,
  SchoolIdentity,
  Teacher,
} from './types/schedule';
import { TEACHER_COLOR_PALETTE } from './utils/colors';
import {
  analyzeConflicts,
  cellKey,
  formatIndonesianDate,
  generateAntiBentrokSchedule,
} from './utils/scheduler';

const STORAGE_KEY = 'sijaga_ujian_state_v1';
const INDONESIAN_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function hydrateState(parsed: AppState): AppState {
  return {
    ...parsed,
    teachers: parsed.teachers.map((t, idx) => ({
      ...t,
      code: /^G\d+$/i.test(t.code.trim()) ? t.code.trim().slice(1) : t.code,
      color: t.color || TEACHER_COLOR_PALETTE[idx % TEACHER_COLOR_PALETTE.length].hex,
    })),
    sessions: (parsed.sessions ?? []).map((s) => ({
      ...s,
      shiftGroup: s.shiftGroup || 'Sesi 1',
    })),
    settings: {
      ...DEFAULT_APP_STATE.settings,
      ...parsed.settings,
      maxShiftsPerDayPerTeacher: parsed.settings?.maxShiftsPerDayPerTeacher ?? 0,
      availableShifts:
        parsed.settings?.availableShifts && parsed.settings.availableShifts.length > 0
          ? parsed.settings.availableShifts
          : DEFAULT_APP_STATE.settings.availableShifts,
    },
    printConfig: {
      ...DEFAULT_APP_STATE.printConfig,
      ...parsed.printConfig,
      showColors: parsed.printConfig?.showColors ?? true,
      filterShift: parsed.printConfig?.filterShift || 'ALL',
    },
  };
}

function createInitialState(): AppState {
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppState;
        if (parsed && parsed.identity && Array.isArray(parsed.teachers)) {
          return hydrateState(parsed);
        }
      }
    } catch {
      // Ignore storage errors and fall back to default state
    }
  }

  const initialRun = generateAntiBentrokSchedule(
    DEFAULT_APP_STATE.teachers,
    DEFAULT_APP_STATE.rooms,
    DEFAULT_APP_STATE.sessions,
    [],
    DEFAULT_APP_STATE.settings,
    { keepLocked: false, randomize: false }
  );

  return {
    ...DEFAULT_APP_STATE,
    assignments: initialRun.assignments,
  };
}

const TAB_TITLES: Record<ActiveTab, { title: string; subtitle: string }> = {
  matrix: {
    title: 'Matriks Jadwal Mengawas',
    subtitle: 'Penyusunan otomatis anti-bentrok, warna pembeda per guru, dan pengaturan rentang hari.',
  },
  teachers: {
    title: 'Data Guru & Pengawas',
    subtitle: 'Kelola daftar pengawas, warna pembeda, mata pelajaran diampu, dan jadwal berhalangan.',
  },
  rooms_sessions: {
    title: 'Ruang & Jam Ujian',
    subtitle: 'Atur jumlah ruang ujian, kebutuhan pengawas, serta pembagian Sesi (Shift) dan Jam ke-1 / Jam ke-2.',
  },
  print_a4: {
    title: 'Pratinjau Cetak & PDF A4',
    subtitle: 'Siap cetak langsung ke kertas A4 atau ekspor sebagai file PDF resmi sekolah.',
  },
  settings: {
    title: 'Identitas Sekolah & Kop Surat',
    subtitle: 'Sesuaikan kop surat resmi, pejabat penanda tangan, dan cadangan data JSON.',
  },
};

export default function App() {
  const [state, setState] = useState<AppState>(createInitialState);
  const [activeTab, setActiveTab] = useState<ActiveTab>('matrix');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota errors
    }
  }, [state]);

  useEffect(() => {
    if (!feedbackBanner) return;
    const timer = window.setTimeout(() => setFeedbackBanner(null), 4500);
    return () => window.clearTimeout(timer);
  }, [feedbackBanner]);

  const activeSessions = useMemo(() => {
    if (!state.settings.scheduleEndDate) return state.sessions;
    return state.sessions.filter((s) => s.date <= state.settings.scheduleEndDate!);
  }, [state.sessions, state.settings.scheduleEndDate]);

  const analysis = useMemo(
    () =>
      analyzeConflicts(
        state.teachers,
        state.rooms,
        activeSessions,
        state.assignments,
        state.settings
      ),
    [state.teachers, state.rooms, activeSessions, state.assignments, state.settings]
  );

  const handleAutoGenerate = (randomize: boolean) => {
    const result = generateAntiBentrokSchedule(
      state.teachers,
      state.rooms,
      activeSessions,
      state.assignments,
      state.settings,
      { keepLocked: true, randomize }
    );
    setState((prev) => ({ ...prev, assignments: result.assignments }));

    if (result.unfilledSlots > 0) {
      setFeedbackBanner(
        `Jadwal disusun: ${result.filledCount}/${result.totalRequired} slot terisi. ${result.unfilledSlots} slot belum terpenuhi karena jumlah pengawas tersedia kurang pada jam ujian tersebut.`
      );
    } else if (result.relaxedSlots > 0) {
      setFeedbackBanner(
        `Jadwal disusun tanpa bentrok waktu (${result.filledCount}/${result.totalRequired} slot terisi), dengan ${result.relaxedSlots} penyesuaian aturan lunak.`
      );
    } else {
      setFeedbackBanner(
        `Jadwal anti-bentrok berhasil disusun: ${result.filledCount}/${result.totalRequired} slot terisi sempurna.`
      );
    }
  };

  const handleApplyDayRange = (config: DayRangeConfig) => {
    const start = new Date(`${config.startDate}T00:00:00`);
    const end = new Date(`${config.endDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return;
    }

    const defaultTimes = ['07.30 – 09.30', '10.00 – 12.00', '13.00 – 14.30'];
    const existingBySlot = new Map<string, ExamSession>();
    state.sessions.forEach((s) => {
      existingBySlot.set(`${s.date}__${s.shiftGroup || 'Sesi 1'}__${s.sessionNumber}`, s);
    });

    const nextSessions: ExamSession[] = [];
    const cursor = new Date(start);
    const baseTime = Date.now();
    let dayOrder = 0;
    let safety = 0;

    while (cursor <= end && safety < 60) {
      const dow = cursor.getDay();
      if (config.activeWeekdays.includes(dow)) {
        dayOrder++;
        const iso = cursor.toISOString().slice(0, 10);
        const dayName = INDONESIAN_DAYS[dow] ?? 'Senin';

        for (let s = 1; s <= config.sessionsPerDay; s++) {
          const existing = existingBySlot.get(`${iso}__Sesi 1__${s}`);
          if (existing) {
            nextSessions.push({
              ...existing,
              shiftGroup: existing.shiftGroup || 'Sesi 1',
            });
          } else {
            nextSessions.push({
              id: `s_${baseTime}_${dayOrder}_${s}`,
              dayLabel: dayName,
              date: iso,
              shiftGroup: 'Sesi 1',
              sessionNumber: s,
              timeRange: defaultTimes[s - 1] ?? `Jam ke-${s}`,
              subject: `Mata Pelajaran Hari ${dayOrder} (Jam ke-${s})`,
              gradeLevel: 'X / XI / XII',
            });
          }
        }
      }
      cursor.setDate(cursor.getDate() + 1);
      safety++;
    }

    const nextSettings: SchedulerSettings = {
      ...state.settings,
      scheduleEndDate: null,
    };

    const result = generateAntiBentrokSchedule(
      state.teachers,
      state.rooms,
      nextSessions,
      state.assignments,
      nextSettings,
      { keepLocked: true, randomize: false }
    );

    setState((prev) => ({
      ...prev,
      sessions: nextSessions,
      settings: nextSettings,
      assignments: result.assignments,
    }));

    setFeedbackBanner(
      `Rentang hari diterapkan: ${dayOrder} hari (${nextSessions.length} slot jam) sampai ${formatIndonesianDate(
        config.endDate,
        true
      )}. Jadwal anti-bentrok langsung diperbarui.`
    );
  };

  const handleApplyShiftConfig = (config: ShiftModeConfig) => {
    const sourceSessions = activeSessions.length > 0 ? activeSessions : state.sessions;
    const uniqueDateMap = new Map<string, string>();
    sourceSessions.forEach((s) => {
      if (!uniqueDateMap.has(s.date)) {
        uniqueDateMap.set(s.date, s.dayLabel);
      }
    });

    const sortedDates = Array.from(uniqueDateMap.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    if (sortedDates.length === 0) return;

    const exactLookup = new Map<string, ExamSession>();
    const fallbackLookup = new Map<string, ExamSession>();
    state.sessions.forEach((s) => {
      exactLookup.set(`${s.date}__${s.shiftGroup || 'Sesi 1'}__${s.sessionNumber}`, s);
      if (!fallbackLookup.has(`${s.date}__${s.sessionNumber}`)) {
        fallbackLookup.set(`${s.date}__${s.sessionNumber}`, s);
      }
    });

    const nextSessions: ExamSession[] = [];
    const baseTime = Date.now();

    sortedDates.forEach(([dateIso, dayLabel], dayIdx) => {
      config.shifts.forEach((shift, shiftIdx) => {
        for (let jam = 1; jam <= config.hoursPerShift; jam++) {
          const shiftName = shift.name.trim() || `Sesi ${shiftIdx + 1}`;
          const existing =
            exactLookup.get(`${dateIso}__${shiftName}__${jam}`) ||
            fallbackLookup.get(`${dateIso}__${jam}`);
          const timeRange = jam === 1 ? shift.jam1Time : shift.jam2Time;

          nextSessions.push({
            id: existing && existing.shiftGroup === shiftName
              ? existing.id
              : `s_${baseTime}_${dayIdx}_${shiftIdx}_${jam}`,
            dayLabel,
            date: dateIso,
            shiftGroup: shiftName,
            sessionNumber: jam,
            timeRange: timeRange || (jam === 1 ? '07.30 – 09.00' : '09.30 – 11.00'),
            subject: existing?.subject || `Mata Pelajaran Hari ${dayIdx + 1} (Jam ke-${jam})`,
            gradeLevel: existing?.gradeLevel || 'X / XI / XII',
          });
        }
      });
    });

    const nextSettings: SchedulerSettings = {
      ...state.settings,
      maxShiftsPerDayPerTeacher: config.maxShiftsPerDayPerTeacher,
      availableShifts: config.shifts.map((s, i) => s.name.trim() || `Sesi ${i + 1}`),
    };

    const result = generateAntiBentrokSchedule(
      state.teachers,
      state.rooms,
      nextSessions,
      state.assignments,
      nextSettings,
      { keepLocked: true, randomize: false }
    );

    setState((prev) => ({
      ...prev,
      sessions: nextSessions,
      settings: nextSettings,
      assignments: result.assignments,
      printConfig: {
        ...prev.printConfig,
        filterShift: 'ALL',
      },
    }));

    setFeedbackBanner(
      `Pengaturan Sesi diterapkan: ${config.shifts.length} Sesi (${config.hoursPerShift} Jam/sesi = ${nextSessions.length} total slot). Jadwal anti-bentrok langsung diperbarui.`
    );
  };

  const handleClearUnlocked = () => {
    setState((prev) => ({
      ...prev,
      assignments: prev.assignments.map((a) =>
        a.locked ? a : { ...a, teacherId: null }
      ),
    }));
    setFeedbackBanner('Slot yang tidak dikunci telah dikosongkan.');
  };

  const handleAssignCell = (
    sessionId: string,
    roomId: string,
    proctorSlot: number,
    teacherId: string | null
  ) => {
    setState((prev) => {
      const key = cellKey(sessionId, roomId, proctorSlot);
      const exists = prev.assignments.some(
        (a) => cellKey(a.sessionId, a.roomId, a.proctorSlot) === key
      );
      const nextAssignments = exists
        ? prev.assignments.map((a) =>
            cellKey(a.sessionId, a.roomId, a.proctorSlot) === key
              ? { ...a, teacherId }
              : a
          )
        : [
            ...prev.assignments,
            { sessionId, roomId, proctorSlot, teacherId, locked: false },
          ];
      return { ...prev, assignments: nextAssignments };
    });
  };

  const handleToggleLockCell = (
    sessionId: string,
    roomId: string,
    proctorSlot: number
  ) => {
    setState((prev) => {
      const key = cellKey(sessionId, roomId, proctorSlot);
      return {
        ...prev,
        assignments: prev.assignments.map((a) =>
          cellKey(a.sessionId, a.roomId, a.proctorSlot) === key
            ? { ...a, locked: !a.locked }
            : a
        ),
      };
    });
  };

  const handleUnlockAll = () => {
    setState((prev) => ({
      ...prev,
      assignments: prev.assignments.map((a) => ({ ...a, locked: false })),
    }));
  };

  // Teachers CRUD
  const handleAddTeacher = (payload: Omit<Teacher, 'id'>) => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setState((prev) => ({
      ...prev,
      teachers: [
        ...prev.teachers,
        {
          ...payload,
          id,
          color:
            payload.color ||
            TEACHER_COLOR_PALETTE[prev.teachers.length % TEACHER_COLOR_PALETTE.length].hex,
        },
      ],
    }));
  };

  const handleBulkAddTeachers = (items: Array<Omit<Teacher, 'id'>>) => {
    const baseTime = Date.now();
    setState((prev) => {
      const startIndex = prev.teachers.length;
      const additions: Teacher[] = items.map((item, idx) => ({
        ...item,
        id: `t_${baseTime}_${idx}`,
        color:
          item.color ||
          TEACHER_COLOR_PALETTE[(startIndex + idx) % TEACHER_COLOR_PALETTE.length].hex,
      }));
      return {
        ...prev,
        teachers: [...prev.teachers, ...additions],
      };
    });
  };

  const handleUpdateTeacher = (updated: Teacher) => {
    setState((prev) => ({
      ...prev,
      teachers: prev.teachers.map((t) => (t.id === updated.id ? updated : t)),
    }));
  };

  const handleDeleteTeacher = (id: string) => {
    setState((prev) => ({
      ...prev,
      teachers: prev.teachers.filter((t) => t.id !== id),
      assignments: prev.assignments.map((a) =>
        a.teacherId === id ? { ...a, teacherId: null, locked: false } : a
      ),
    }));
  };

  const handleAssignDistinctColors = () => {
    setState((prev) => ({
      ...prev,
      teachers: prev.teachers.map((t, idx) => ({
        ...t,
        color: TEACHER_COLOR_PALETTE[idx % TEACHER_COLOR_PALETTE.length].hex,
      })),
    }));
    setFeedbackBanner('Warna pembeda setiap guru telah diperbarui secara otomatis.');
  };

  // Rooms CRUD
  const handleAddRoom = (payload: Omit<Room, 'id'>) => {
    const id = `r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setState((prev) => ({
      ...prev,
      rooms: [...prev.rooms, { ...payload, id }],
    }));
  };

  const handleUpdateRoom = (updated: Room) => {
    setState((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) => (r.id === updated.id ? updated : r)),
    }));
  };

  const handleDeleteRoom = (id: string) => {
    setState((prev) => ({
      ...prev,
      rooms: prev.rooms.filter((r) => r.id !== id),
      assignments: prev.assignments.filter((a) => a.roomId !== id),
    }));
  };

  const handleSetAllProctorsCount = (count: 1 | 2) => {
    setState((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) => ({ ...r, proctorsRequired: count })),
    }));
  };

  // Sessions CRUD
  const sortSessions = (list: ExamSession[]): ExamSession[] =>
    [...list].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      const shiftA = a.shiftGroup || 'Sesi 1';
      const shiftB = b.shiftGroup || 'Sesi 1';
      if (shiftA !== shiftB) return shiftA.localeCompare(shiftB);
      return a.sessionNumber - b.sessionNumber;
    });

  const handleAddSession = (payload: Omit<ExamSession, 'id'>) => {
    const id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setState((prev) => ({
      ...prev,
      sessions: sortSessions([
        ...prev.sessions,
        { ...payload, shiftGroup: payload.shiftGroup || 'Sesi 1', id },
      ]),
    }));
  };

  const handleBulkAddSessions = (items: Array<Omit<ExamSession, 'id'>>) => {
    const baseTime = Date.now();
    const additions: ExamSession[] = items.map((item, idx) => ({
      ...item,
      shiftGroup: item.shiftGroup || 'Sesi 1',
      id: `s_${baseTime}_${idx}`,
    }));
    setState((prev) => ({
      ...prev,
      sessions: sortSessions([...prev.sessions, ...additions]),
    }));
  };

  const handleUpdateSession = (updated: ExamSession) => {
    setState((prev) => ({
      ...prev,
      sessions: sortSessions(
        prev.sessions.map((s) =>
          s.id === updated.id
            ? { ...updated, shiftGroup: updated.shiftGroup || 'Sesi 1' }
            : s
        )
      ),
    }));
  };

  const handleDeleteSession = (id: string) => {
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.filter((s) => s.id !== id),
      assignments: prev.assignments.filter((a) => a.sessionId !== id),
    }));
  };

  const handleResetDefault = () => {
    const initialRun = generateAntiBentrokSchedule(
      DEFAULT_APP_STATE.teachers,
      DEFAULT_APP_STATE.rooms,
      DEFAULT_APP_STATE.sessions,
      [],
      DEFAULT_APP_STATE.settings,
      { keepLocked: false, randomize: false }
    );
    setState({
      ...DEFAULT_APP_STATE,
      assignments: initialRun.assignments,
    });
  };

  const headerMeta = TAB_TITLES[activeTab];

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        schoolName={state.identity.schoolName}
        examTitle={state.identity.examTitle}
        teacherCount={state.teachers.filter((t) => t.active).length}
        roomCount={state.rooms.length}
        sessionCount={activeSessions.length}
        errorCount={analysis.errorCount}
        emptyCount={analysis.emptyCount}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Workspace Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Buka menu navigasi"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 truncate">
                {headerMeta.title}
              </h1>
              <p className="hidden sm:block text-xs text-slate-500 truncate">
                {headerMeta.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden md:inline-block text-xs text-slate-500 font-mono tabular-nums whitespace-nowrap">
              TP {state.identity.academicYear}
            </span>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden print:p-0">
          {feedbackBanner && (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-900 flex items-center justify-between gap-3 no-print">
              <span>{feedbackBanner}</span>
              <button
                type="button"
                onClick={() => setFeedbackBanner(null)}
                className="text-xs font-semibold text-blue-700 hover:underline shrink-0 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          )}

          {activeTab === 'matrix' && (
            <ScheduleMatrixView
              teachers={state.teachers}
              rooms={state.rooms}
              allSessions={state.sessions}
              sessions={activeSessions}
              assignments={state.assignments}
              settings={state.settings}
              analysis={analysis}
              onUpdateSettings={(next: SchedulerSettings) =>
                setState((prev) => ({ ...prev, settings: next }))
              }
              onApplyDayRange={handleApplyDayRange}
              onApplyShiftConfig={handleApplyShiftConfig}
              onAutoGenerate={handleAutoGenerate}
              onClearUnlocked={handleClearUnlocked}
              onAssignCell={handleAssignCell}
              onToggleLockCell={handleToggleLockCell}
              onUnlockAll={handleUnlockAll}
              onGoToPrint={() => setActiveTab('print_a4')}
            />
          )}

          {activeTab === 'teachers' && (
            <TeachersView
              teachers={state.teachers}
              sessions={activeSessions}
              teacherTotalCounts={analysis.teacherTotalCounts}
              onAddTeacher={handleAddTeacher}
              onBulkAddTeachers={handleBulkAddTeachers}
              onUpdateTeacher={handleUpdateTeacher}
              onDeleteTeacher={handleDeleteTeacher}
              onAssignDistinctColors={handleAssignDistinctColors}
            />
          )}

          {activeTab === 'rooms_sessions' && (
            <RoomsAndSessionsView
              rooms={state.rooms}
              sessions={state.sessions}
              onAddRoom={handleAddRoom}
              onUpdateRoom={handleUpdateRoom}
              onDeleteRoom={handleDeleteRoom}
              onSetAllProctorsCount={handleSetAllProctorsCount}
              onAddSession={handleAddSession}
              onUpdateSession={handleUpdateSession}
              onDeleteSession={handleDeleteSession}
              onBulkAddSessions={handleBulkAddSessions}
            />
          )}

          {activeTab === 'print_a4' && (
            <PrintPreviewA4View
              identity={state.identity}
              teachers={state.teachers}
              rooms={state.rooms}
              sessions={activeSessions}
              assignments={state.assignments}
              printConfig={state.printConfig}
              teacherTotalCounts={analysis.teacherTotalCounts}
              onUpdatePrintConfig={(next: PrintConfig) =>
                setState((prev) => ({ ...prev, printConfig: next }))
              }
            />
          )}

          {activeTab === 'settings' && (
            <SchoolSettingsView
              identity={state.identity}
              fullState={state}
              onUpdateIdentity={(next: SchoolIdentity) =>
                setState((prev) => ({ ...prev, identity: next }))
              }
              onImportState={(imported: AppState) => setState(hydrateState(imported))}
              onResetDefault={handleResetDefault}
            />
          )}
        </main>
      </div>
    </div>
  );
}
