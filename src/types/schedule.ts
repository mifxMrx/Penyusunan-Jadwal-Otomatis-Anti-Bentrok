export interface Teacher {
  id: string;
  code: string;
  name: string;
  nip: string;
  subjects: string[];
  unavailableSessionIds: string[];
  maxSessions: number | null;
  active: boolean;
  color?: string;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  location: string;
  capacity: number;
  proctorsRequired: 1 | 2;
}

export interface ExamSession {
  id: string;
  dayLabel: string;
  date: string; // YYYY-MM-DD
  sessionNumber: number; // Jam ke-1, Jam ke-2, Jam ke-3
  shiftGroup?: string; // Sesi 1, Sesi 2, Sesi 3 (Gelombang / Shift)
  timeRange: string;
  subject: string;
  gradeLevel: string;
}

export interface Assignment {
  sessionId: string;
  roomId: string;
  proctorSlot: number; // 0 for Pengawas 1, 1 for Pengawas 2
  teacherId: string | null;
  locked?: boolean;
}

export interface SchoolIdentity {
  institutionLine1: string;
  institutionLine2: string;
  schoolName: string;
  address: string;
  examTitle: string;
  academicYear: string;
  city: string;
  approvalDate: string;
  principalName: string;
  principalNip: string;
  committeeChairName: string;
  committeeChairNip: string;
  logoDataUrl?: string;
}

export interface SchedulerSettings {
  avoidOwnSubject: boolean;
  maxPerDayPerTeacher: number;
  maxShiftsPerDayPerTeacher?: number;
  balanceLoad: boolean;
  scheduleEndDate?: string | null;
  availableShifts?: string[];
}

export type ConflictType =
  | 'DOUBLE_BOOKING'
  | 'UNAVAILABLE'
  | 'OWN_SUBJECT'
  | 'MAX_DAILY'
  | 'MAX_SHIFT_DAILY'
  | 'MAX_TOTAL'
  | 'EMPTY_SLOT';

export interface ConflictItem {
  id: string;
  type: ConflictType;
  severity: 'error' | 'warning';
  sessionId: string;
  roomId: string;
  proctorSlot: number;
  teacherId: string | null;
  message: string;
}

export interface PrintConfig {
  orientation: 'portrait' | 'landscape';
  documentMode: 'matrix' | 'per_teacher';
  displayMode: 'code_with_legend' | 'full_name';
  showLegend: boolean;
  showSignature: boolean;
  showColors?: boolean;
  filterShift?: string;
  fontSize: 'compact' | 'normal';
}

export type ActiveTab = 'matrix' | 'teachers' | 'rooms_sessions' | 'print_a4' | 'settings';

export interface AppState {
  identity: SchoolIdentity;
  teachers: Teacher[];
  rooms: Room[];
  sessions: ExamSession[];
  assignments: Assignment[];
  settings: SchedulerSettings;
  printConfig: PrintConfig;
}
