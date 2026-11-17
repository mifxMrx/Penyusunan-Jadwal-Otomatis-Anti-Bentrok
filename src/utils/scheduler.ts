import {
  Assignment,
  ConflictItem,
  ExamSession,
  Room,
  SchedulerSettings,
  Teacher,
} from '../types/schedule';

export function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function isTeachingExamSubject(teacher: Teacher, examSubject: string): boolean {
  if (!teacher.subjects.length || !examSubject.trim()) return false;
  const examParts = examSubject
    .split(/[/,&+]+/)
    .map((part) => normalizeText(part))
    .filter(Boolean);

  return teacher.subjects.some((subj) => {
    const s = normalizeText(subj);
    if (!s) return false;
    return examParts.some((part) => part === s || part.includes(s) || s.includes(part));
  });
}

export function getTimeKey(session: ExamSession): string {
  return `${session.date}__${normalizeText(session.timeRange)}`;
}

export function formatIndonesianDate(isoDate: string, shortMonth = false): string {
  if (!isoDate) return '-';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const [year, monthStr, dayStr] = parts;
  const monthIdx = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);
  const fullMonths = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const shortMonths = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
  ];
  const monthName = (shortMonth ? shortMonths : fullMonths)[monthIdx] ?? monthStr;
  return `${day} ${monthName} ${year}`;
}

export interface ConflictAnalysis {
  conflicts: ConflictItem[];
  cellConflicts: Record<string, ConflictItem[]>;
  errorCount: number;
  warningCount: number;
  emptyCount: number;
  teacherTotalCounts: Record<string, number>;
  teacherDayCounts: Record<string, Record<string, number>>;
}

export function cellKey(sessionId: string, roomId: string, proctorSlot: number): string {
  return `${sessionId}__${roomId}__${proctorSlot}`;
}

export function analyzeConflicts(
  teachers: Teacher[],
  rooms: Room[],
  sessions: ExamSession[],
  assignments: Assignment[],
  settings: SchedulerSettings
): ConflictAnalysis {
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  const roomMap = new Map(rooms.map((r) => [r.id, r]));
  const sessionMap = new Map(sessions.map((s) => [s.id, s]));

  const conflicts: ConflictItem[] = [];
  const cellConflicts: Record<string, ConflictItem[]> = {};
  const teacherTotalCounts: Record<string, number> = {};
  const teacherDayCounts: Record<string, Record<string, number>> = {};

  const teacherShiftDays: Record<string, Record<string, Set<string>>> = {};

  teachers.forEach((t) => {
    teacherTotalCounts[t.id] = 0;
    teacherDayCounts[t.id] = {};
    teacherShiftDays[t.id] = {};
  });

  // Track slots per teacher per sessionId and per date+timeRange
  const slotByTeacherTime = new Map<string, Array<{ assignment: Assignment; session: ExamSession; room: Room }>>();

  const addCellConflict = (item: ConflictItem) => {
    conflicts.push(item);
    const key = cellKey(item.sessionId, item.roomId, item.proctorSlot);
    if (!cellConflicts[key]) cellConflicts[key] = [];
    cellConflicts[key].push(item);
  };

  // Build valid expected slots first
  const assignmentMap = new Map<string, Assignment>();
  assignments.forEach((a) => {
    assignmentMap.set(cellKey(a.sessionId, a.roomId, a.proctorSlot), a);
  });

  for (const session of sessions) {
    for (const room of rooms) {
      for (let slot = 0; slot < room.proctorsRequired; slot++) {
        const key = cellKey(session.id, room.id, slot);
        const assignment = assignmentMap.get(key);
        const teacherId = assignment?.teacherId ?? null;
        const shiftLabel = session.shiftGroup || 'Sesi 1';

        if (!teacherId) {
          addCellConflict({
            id: `empty_${key}`,
            type: 'EMPTY_SLOT',
            severity: 'warning',
            sessionId: session.id,
            roomId: room.id,
            proctorSlot: slot,
            teacherId: null,
            message: `${session.dayLabel} (${shiftLabel} · Jam ke-${session.sessionNumber}) · ${room.code} (Pengawas ${slot + 1}) belum diisi`,
          });
          continue;
        }

        const teacher = teacherMap.get(teacherId);
        if (!teacher) continue;

        teacherTotalCounts[teacher.id] = (teacherTotalCounts[teacher.id] ?? 0) + 1;
        teacherDayCounts[teacher.id][session.date] =
          (teacherDayCounts[teacher.id][session.date] ?? 0) + 1;
        if (!teacherShiftDays[teacher.id][session.date]) {
          teacherShiftDays[teacher.id][session.date] = new Set();
        }
        teacherShiftDays[teacher.id][session.date].add(shiftLabel);

        const timeTeacherKey = `${teacher.id}__${getTimeKey(session)}`;
        const existingAtTime = slotByTeacherTime.get(timeTeacherKey) ?? [];
        existingAtTime.push({
          assignment: assignment!,
          session,
          room,
        });
        slotByTeacherTime.set(timeTeacherKey, existingAtTime);

        // Unavailable check
        if (teacher.unavailableSessionIds.includes(session.id)) {
          addCellConflict({
            id: `unavail_${key}`,
            type: 'UNAVAILABLE',
            severity: 'error',
            sessionId: session.id,
            roomId: room.id,
            proctorSlot: slot,
            teacherId: teacher.id,
            message: `${teacher.code} (${teacher.name}) ditandai berhalangan pada ${session.dayLabel} · ${shiftLabel} · Jam ke-${session.sessionNumber}`,
          });
        }

        // Own subject check
        if (settings.avoidOwnSubject && isTeachingExamSubject(teacher, session.subject)) {
          addCellConflict({
            id: `subj_${key}`,
            type: 'OWN_SUBJECT',
            severity: 'warning',
            sessionId: session.id,
            roomId: room.id,
            proctorSlot: slot,
            teacherId: teacher.id,
            message: `${teacher.code} mengampu mapel ${session.subject} yang sedang diujikan di ${room.code}`,
          });
        }
      }
    }
  }

  // Double booking check
  slotByTeacherTime.forEach((entries, mapKey) => {
    if (entries.length > 1) {
      const teacherId = mapKey.split('__')[0];
      const teacher = teacherMap.get(teacherId);
      const roomCodes = entries.map((e) => e.room.code).join(', ');
      entries.forEach((entry) => {
        const key = cellKey(entry.session.id, entry.room.id, entry.assignment.proctorSlot);
        addCellConflict({
          id: `double_${key}`,
          type: 'DOUBLE_BOOKING',
          severity: 'error',
          sessionId: entry.session.id,
          roomId: entry.room.id,
          proctorSlot: entry.assignment.proctorSlot,
          teacherId,
          message: `Bentrok: ${teacher?.code ?? ''} (${teacher?.name ?? ''}) ditugaskan bersamaan di ${roomCodes} (${entry.session.dayLabel} ${entry.session.timeRange})`,
        });
      });
    }
  });

  // Daily & total max checks
  for (const session of sessions) {
    for (const room of rooms) {
      for (let slot = 0; slot < room.proctorsRequired; slot++) {
        const key = cellKey(session.id, room.id, slot);
        const assignment = assignmentMap.get(key);
        if (!assignment?.teacherId) continue;
        const teacher = teacherMap.get(assignment.teacherId);
        if (!teacher) continue;

        const dayCount = teacherDayCounts[teacher.id]?.[session.date] ?? 0;
        if (settings.maxPerDayPerTeacher > 0 && dayCount > settings.maxPerDayPerTeacher) {
          addCellConflict({
            id: `maxday_${key}`,
            type: 'MAX_DAILY',
            severity: 'warning',
            sessionId: session.id,
            roomId: room.id,
            proctorSlot: slot,
            teacherId: teacher.id,
            message: `${teacher.code} mengawas ${dayCount} jam pada ${session.dayLabel} (batas ${settings.maxPerDayPerTeacher} jam/hari)`,
          });
        }

        const shiftCountToday = teacherShiftDays[teacher.id]?.[session.date]?.size ?? 0;
        const maxShiftsPerDay = settings.maxShiftsPerDayPerTeacher ?? 0;
        if (maxShiftsPerDay > 0 && shiftCountToday > maxShiftsPerDay) {
          addCellConflict({
            id: `maxshift_${key}`,
            type: 'MAX_SHIFT_DAILY',
            severity: 'warning',
            sessionId: session.id,
            roomId: room.id,
            proctorSlot: slot,
            teacherId: teacher.id,
            message: `${teacher.code} mengawas ${shiftCountToday} sesi berbeda pada ${session.dayLabel} (batas ${maxShiftsPerDay} sesi/hari)`,
          });
        }

        if (teacher.maxSessions !== null && teacherTotalCounts[teacher.id] > teacher.maxSessions) {
          addCellConflict({
            id: `maxtot_${key}`,
            type: 'MAX_TOTAL',
            severity: 'warning',
            sessionId: session.id,
            roomId: room.id,
            proctorSlot: slot,
            teacherId: teacher.id,
            message: `${teacher.code} mendapat ${teacherTotalCounts[teacher.id]} jam (batas maks ${teacher.maxSessions})`,
          });
        }
      }
    }
  }

  // Also ensure unused roomMap/sessionMap don't cause lint warnings
  void roomMap;
  void sessionMap;

  const errorCount = conflicts.filter((c) => c.severity === 'error').length;
  const warningCount = conflicts.filter((c) => c.severity === 'warning' && c.type !== 'EMPTY_SLOT').length;
  const emptyCount = conflicts.filter((c) => c.type === 'EMPTY_SLOT').length;

  return {
    conflicts,
    cellConflicts,
    errorCount,
    warningCount,
    emptyCount,
    teacherTotalCounts,
    teacherDayCounts,
  };
}

export interface CandidateStatus {
  teacher: Teacher;
  eligibleHard: boolean;
  eligibleStrict: boolean;
  reasons: string[];
  currentTotal: number;
  currentDayTotal: number;
  conflictRoomCode?: string;
}

export function getCandidateStatusesForCell(
  teachers: Teacher[],
  sessions: ExamSession[],
  rooms: Room[],
  assignments: Assignment[],
  targetSessionId: string,
  targetRoomId: string,
  targetProctorSlot: number,
  settings: SchedulerSettings
): CandidateStatus[] {
  const session = sessions.find((s) => s.id === targetSessionId);
  const roomMap = new Map(rooms.map((r) => [r.id, r]));
  if (!session) return [];

  const targetTimeKey = getTimeKey(session);
  const sessionMap = new Map(sessions.map((s) => [s.id, s]));

  // Count loads excluding current cell
  const totalCounts: Record<string, number> = {};
  const dayCounts: Record<string, number> = {};
  const dayShifts: Record<string, Set<string>> = {};
  const timeAssignments = new Map<string, string>(); // teacherId -> roomCode

  for (const a of assignments) {
    if (
      a.sessionId === targetSessionId &&
      a.roomId === targetRoomId &&
      a.proctorSlot === targetProctorSlot
    ) {
      continue;
    }
    if (!a.teacherId) continue;
    const s = sessionMap.get(a.sessionId);
    if (!s) continue;

    totalCounts[a.teacherId] = (totalCounts[a.teacherId] ?? 0) + 1;
    if (s.date === session.date) {
      dayCounts[a.teacherId] = (dayCounts[a.teacherId] ?? 0) + 1;
      if (!dayShifts[a.teacherId]) dayShifts[a.teacherId] = new Set();
      dayShifts[a.teacherId].add(s.shiftGroup || 'Sesi 1');
    }
    if (getTimeKey(s) === targetTimeKey) {
      timeAssignments.set(a.teacherId, roomMap.get(a.roomId)?.code ?? a.roomId);
    }
  }

  const targetShift = session.shiftGroup || 'Sesi 1';
  const maxShiftsPerDay = settings.maxShiftsPerDayPerTeacher ?? 0;

  return teachers
    .filter((t) => t.active)
    .map((teacher) => {
      const reasons: string[] = [];
      const conflictRoomCode = timeAssignments.get(teacher.id);
      if (conflictRoomCode) {
        reasons.push(`Bentrok di ${conflictRoomCode}`);
      }
      if (teacher.unavailableSessionIds.includes(session.id)) {
        reasons.push('Berhalangan');
      }
      const teachesSubject = settings.avoidOwnSubject && isTeachingExamSubject(teacher, session.subject);
      if (teachesSubject) {
        reasons.push(`Mengampu ${session.subject}`);
      }
      const dayTotal = dayCounts[teacher.id] ?? 0;
      if (settings.maxPerDayPerTeacher > 0 && dayTotal >= settings.maxPerDayPerTeacher) {
        reasons.push(`Sudah ${dayTotal} jam hari ini`);
      }
      const existingShifts = dayShifts[teacher.id];
      if (
        maxShiftsPerDay > 0 &&
        existingShifts &&
        !existingShifts.has(targetShift) &&
        existingShifts.size >= maxShiftsPerDay
      ) {
        reasons.push(`Sudah ${existingShifts.size} sesi hari ini`);
      }
      const total = totalCounts[teacher.id] ?? 0;
      if (teacher.maxSessions !== null && total >= teacher.maxSessions) {
        reasons.push(`Batas maks (${teacher.maxSessions})`);
      }

      const eligibleHard = !conflictRoomCode && !teacher.unavailableSessionIds.includes(session.id);
      const eligibleStrict = eligibleHard && reasons.length === 0;

      return {
        teacher,
        eligibleHard,
        eligibleStrict,
        reasons,
        currentTotal: total,
        currentDayTotal: dayTotal,
        conflictRoomCode,
      };
    })
    .sort((a, b) => {
      if (a.eligibleStrict !== b.eligibleStrict) return a.eligibleStrict ? -1 : 1;
      if (a.eligibleHard !== b.eligibleHard) return a.eligibleHard ? -1 : 1;
      if (a.currentTotal !== b.currentTotal) return a.currentTotal - b.currentTotal;
      return a.teacher.code.localeCompare(b.teacher.code);
    });
}

export interface GenerateOptions {
  keepLocked?: boolean;
  randomize?: boolean;
}

export interface GenerateResult {
  assignments: Assignment[];
  filledCount: number;
  totalRequired: number;
  unfilledSlots: number;
  relaxedSlots: number;
}

export function generateAntiBentrokSchedule(
  teachers: Teacher[],
  rooms: Room[],
  sessions: ExamSession[],
  existingAssignments: Assignment[],
  settings: SchedulerSettings,
  options: GenerateOptions = {}
): GenerateResult {
  const { keepLocked = true, randomize = true } = options;
  const activeTeachers = teachers.filter((t) => t.active);
  const sessionMap = new Map(sessions.map((s) => [s.id, s]));

  // Prepare slot structure
  interface SlotTask {
    sessionId: string;
    roomId: string;
    proctorSlot: number;
    session: ExamSession;
  }

  const existingMap = new Map<string, Assignment>();
  existingAssignments.forEach((a) => {
    existingMap.set(cellKey(a.sessionId, a.roomId, a.proctorSlot), a);
  });

  const resultMap = new Map<string, Assignment>();
  const pendingSlots: SlotTask[] = [];

  // Track state
  const totalCounts: Record<string, number> = {};
  const dayCounts: Record<string, Record<string, number>> = {};
  const dayShiftCounts: Record<string, Record<string, Record<string, number>>> = {};
  const busyAtTime = new Map<string, Set<string>>(); // timeKey -> Set<teacherId>

  activeTeachers.forEach((t) => {
    totalCounts[t.id] = 0;
    dayCounts[t.id] = {};
    dayShiftCounts[t.id] = {};
  });

  const markAssigned = (session: ExamSession, teacherId: string) => {
    const shift = session.shiftGroup || 'Sesi 1';
    totalCounts[teacherId] = (totalCounts[teacherId] ?? 0) + 1;
    dayCounts[teacherId][session.date] = (dayCounts[teacherId][session.date] ?? 0) + 1;
    if (!dayShiftCounts[teacherId][session.date]) {
      dayShiftCounts[teacherId][session.date] = {};
    }
    dayShiftCounts[teacherId][session.date][shift] =
      (dayShiftCounts[teacherId][session.date][shift] ?? 0) + 1;

    const tk = getTimeKey(session);
    if (!busyAtTime.has(tk)) busyAtTime.set(tk, new Set());
    busyAtTime.get(tk)!.add(teacherId);
  };

  const unmarkAssigned = (session: ExamSession, teacherId: string) => {
    const shift = session.shiftGroup || 'Sesi 1';
    totalCounts[teacherId] = Math.max(0, (totalCounts[teacherId] ?? 1) - 1);
    dayCounts[teacherId][session.date] = Math.max(0, (dayCounts[teacherId][session.date] ?? 1) - 1);
    if (dayShiftCounts[teacherId][session.date]?.[shift]) {
      dayShiftCounts[teacherId][session.date][shift] -= 1;
      if (dayShiftCounts[teacherId][session.date][shift] <= 0) {
        delete dayShiftCounts[teacherId][session.date][shift];
      }
    }
    const tk = getTimeKey(session);
    busyAtTime.get(tk)?.delete(teacherId);
  };

  for (const session of sessions) {
    for (const room of rooms) {
      for (let slot = 0; slot < room.proctorsRequired; slot++) {
        const key = cellKey(session.id, room.id, slot);
        const existing = existingMap.get(key);
        if (keepLocked && existing?.locked && existing.teacherId) {
          const validTeacher = activeTeachers.find((t) => t.id === existing.teacherId);
          if (validTeacher) {
            resultMap.set(key, { ...existing });
            markAssigned(session, validTeacher.id);
            continue;
          }
        }
        resultMap.set(key, {
          sessionId: session.id,
          roomId: room.id,
          proctorSlot: slot,
          teacherId: null,
          locked: false,
        });
        pendingSlots.push({ sessionId: session.id, roomId: room.id, proctorSlot: slot, session });
      }
    }
  }

  const isHardValid = (teacher: Teacher, session: ExamSession): boolean => {
    const tk = getTimeKey(session);
    if (busyAtTime.get(tk)?.has(teacher.id)) return false;
    if (teacher.unavailableSessionIds.includes(session.id)) return false;
    return true;
  };

  const maxShiftsPerDay = settings.maxShiftsPerDayPerTeacher ?? 0;

  const isStrictValid = (teacher: Teacher, session: ExamSession): boolean => {
    if (!isHardValid(teacher, session)) return false;
    if (settings.avoidOwnSubject && isTeachingExamSubject(teacher, session.subject)) return false;
    if (
      settings.maxPerDayPerTeacher > 0 &&
      (dayCounts[teacher.id]?.[session.date] ?? 0) >= settings.maxPerDayPerTeacher
    ) {
      return false;
    }
    if (maxShiftsPerDay > 0) {
      const shift = session.shiftGroup || 'Sesi 1';
      const shiftsMap = dayShiftCounts[teacher.id]?.[session.date] ?? {};
      const activeShiftKeys = Object.keys(shiftsMap);
      if (!shiftsMap[shift] && activeShiftKeys.length >= maxShiftsPerDay) {
        return false;
      }
    }
    if (teacher.maxSessions !== null && (totalCounts[teacher.id] ?? 0) >= teacher.maxSessions) {
      return false;
    }
    return true;
  };

  // Random noise map for tie-breaking
  const jitter: Record<string, number> = {};
  activeTeachers.forEach((t) => {
    jitter[t.id] = randomize ? Math.random() : 0;
  });

  // Sort pending slots by MRV (fewest strictly valid teachers first)
  const remaining = [...pendingSlots];
  let relaxedSlots = 0;

  while (remaining.length > 0) {
    // Pick most constrained slot dynamically
    let bestIdx = 0;
    let minChoices = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const task = remaining[i];
      const strictChoices = activeTeachers.filter((t) => isStrictValid(t, task.session)).length;
      if (strictChoices < minChoices) {
        minChoices = strictChoices;
        bestIdx = i;
        if (minChoices === 0) break;
      }
    }

    const [task] = remaining.splice(bestIdx, 1);
    const key = cellKey(task.sessionId, task.roomId, task.proctorSlot);

    // 1. Try strictly valid candidates
    let candidates = activeTeachers.filter((t) => isStrictValid(t, task.session));

    if (candidates.length > 0) {
      candidates.sort((a, b) => {
        if (settings.balanceLoad) {
          const totalDiff = (totalCounts[a.id] ?? 0) - (totalCounts[b.id] ?? 0);
          if (totalDiff !== 0) return totalDiff;
          const dayDiff =
            (dayCounts[a.id]?.[task.session.date] ?? 0) -
            (dayCounts[b.id]?.[task.session.date] ?? 0);
          if (dayDiff !== 0) return dayDiff;
        }
        return (jitter[a.id] ?? 0) - (jitter[b.id] ?? 0);
      });

      const chosen = candidates[0];
      resultMap.set(key, {
        sessionId: task.sessionId,
        roomId: task.roomId,
        proctorSlot: task.proctorSlot,
        teacherId: chosen.id,
        locked: false,
      });
      markAssigned(task.session, chosen.id);
      if (randomize) jitter[chosen.id] = Math.random();
      continue;
    }

    // 2. Try 1-hop swap across already-assigned unlocked slots to preserve strict constraints!
    let swapped = false;
    const assignedEntries = Array.from(resultMap.entries()).filter(([, a]) => a.teacherId && !a.locked);
    for (const [otherKey, otherAssign] of assignedEntries) {
      const otherSession = sessionMap.get(otherAssign.sessionId);
      const otherTeacher = activeTeachers.find((t) => t.id === otherAssign.teacherId);
      if (!otherSession || !otherTeacher) continue;

      // Temporarily unmark otherTeacher from otherSession to test swap
      unmarkAssigned(otherSession, otherTeacher.id);
      const canOtherTakeCurrent = isStrictValid(otherTeacher, task.session);

      if (canOtherTakeCurrent) {
        const replacements = activeTeachers.filter(
          (t) => t.id !== otherTeacher.id && isStrictValid(t, otherSession)
        );
        if (replacements.length > 0) {
          replacements.sort(
            (a, b) => (totalCounts[a.id] ?? 0) - (totalCounts[b.id] ?? 0)
          );
          const rep = replacements[0];
          // Commit swap
          resultMap.set(otherKey, { ...otherAssign, teacherId: rep.id });
          markAssigned(otherSession, rep.id);

          resultMap.set(key, {
            sessionId: task.sessionId,
            roomId: task.roomId,
            proctorSlot: task.proctorSlot,
            teacherId: otherTeacher.id,
            locked: false,
          });
          markAssigned(task.session, otherTeacher.id);
          swapped = true;
          break;
        }
      }
      // Revert temporary unmark
      markAssigned(otherSession, otherTeacher.id);
    }

    if (swapped) continue;

    // 3. Fallback: relax soft constraints (own subject / max daily / max total) while NEVER violating double booking or unavailable
    candidates = activeTeachers.filter((t) => isHardValid(t, task.session));
    if (candidates.length > 0) {
      relaxedSlots++;
      candidates.sort((a, b) => {
        // Prefer not teaching own subject
        const aOwn = settings.avoidOwnSubject && isTeachingExamSubject(a, task.session.subject) ? 1 : 0;
        const bOwn = settings.avoidOwnSubject && isTeachingExamSubject(b, task.session.subject) ? 1 : 0;
        if (aOwn !== bOwn) return aOwn - bOwn;
        // Prefer below maxSessions
        const aOverMax = a.maxSessions !== null && (totalCounts[a.id] ?? 0) >= a.maxSessions ? 1 : 0;
        const bOverMax = b.maxSessions !== null && (totalCounts[b.id] ?? 0) >= b.maxSessions ? 1 : 0;
        if (aOverMax !== bOverMax) return aOverMax - bOverMax;
        // Balance load
        const totalDiff = (totalCounts[a.id] ?? 0) - (totalCounts[b.id] ?? 0);
        if (totalDiff !== 0) return totalDiff;
        return (jitter[a.id] ?? 0) - (jitter[b.id] ?? 0);
      });

      const chosen = candidates[0];
      resultMap.set(key, {
        sessionId: task.sessionId,
        roomId: task.roomId,
        proctorSlot: task.proctorSlot,
        teacherId: chosen.id,
        locked: false,
      });
      markAssigned(task.session, chosen.id);
    }
  }

  const finalAssignments = Array.from(resultMap.values());
  const filledCount = finalAssignments.filter((a) => a.teacherId !== null).length;
  const totalRequired = finalAssignments.length;

  return {
    assignments: finalAssignments,
    filledCount,
    totalRequired,
    unfilledSlots: totalRequired - filledCount,
    relaxedSlots,
  };
}
