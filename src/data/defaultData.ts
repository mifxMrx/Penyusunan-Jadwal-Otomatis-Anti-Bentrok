import { AppState, ExamSession, Room, SchedulerSettings, SchoolIdentity, Teacher } from '../types/schedule';
import { TEACHER_COLOR_PALETTE } from '../utils/colors';

export const DEFAULT_IDENTITY: SchoolIdentity = {
  institutionLine1: 'PEMERINTAH PROVINSI JAWA BARAT',
  institutionLine2: 'DINAS PENDIDIKAN CABANG WILAYAH IV',
  schoolName: 'SMA NEGERI 1 NUSANTARA',
  address: 'Jl. Pendidikan No. 45, Kota Nusantara 40115 · Telp. (022) 4201234 · NPSN: 20219876',
  examTitle: 'JADWAL PENGAWAS PENILAIAN AKHIR SEMESTER (PAS) GANJIL',
  academicYear: '2026/2027',
  city: 'Bandung',
  approvalDate: '25 November 2026',
  principalName: 'Drs. H. Ahmad Fauzan, M.Pd.',
  principalNip: '19680514 199403 1 007',
  committeeChairName: 'Rina Kurniawati, S.Pd., M.Si.',
  committeeChairNip: '19791102 200501 2 012',
};

export const DEFAULT_TEACHERS: Teacher[] = [
  { id: 't1', code: '01', name: 'Budi Santoso, S.Pd.', nip: '198103122008011004', subjects: ['Matematika'], unavailableSessionIds: [], maxSessions: null, active: true, color: TEACHER_COLOR_PALETTE[0].hex },
  { id: 't2', code: '02', name: 'Siti Aminah, M.Pd.', nip: '198307192009022003', subjects: ['Bahasa Indonesia'], unavailableSessionIds: [], maxSessions: null, active: true, color: TEACHER_COLOR_PALETTE[1].hex },
  { id: 't3', code: '03', name: 'Hendra Wijaya, S.Pd.', nip: '198501252010011009', subjects: ['Bahasa Inggris'], unavailableSessionIds: ['s1'], maxSessions: null, active: true, color: TEACHER_COLOR_PALETTE[2].hex },
  { id: 't4', code: '04', name: 'Dewi Lestari, S.Si.', nip: '198709042011012011', subjects: ['Fisika'], unavailableSessionIds: [], maxSessions: null, active: true, color: TEACHER_COLOR_PALETTE[3].hex },
  { id: 't5', code: '05', name: 'Agus Pratama, S.Pd.', nip: '198811152014021002', subjects: ['Kimia'], unavailableSessionIds: [], maxSessions: null, active: true, color: TEACHER_COLOR_PALETTE[4].hex },
  { id: 't6', code: '06', name: 'Nurul Hidayah, M.Pd.', nip: '198404282009032005', subjects: ['Biologi'], unavailableSessionIds: ['s6'], maxSessions: null, active: true, color: TEACHER_COLOR_PALETTE[5].hex },
  { id: 't7', code: '07', name: 'Rizky Ramadhan, S.E.', nip: '199002102015031001', subjects: ['Ekonomi'], unavailableSessionIds: [], maxSessions: null, active: true, color: TEACHER_COLOR_PALETTE[6].hex },
  { id: 't8', code: '08', name: 'Fitri Handayani, S.Sos.', nip: '198906172015042003', subjects: ['Sosiologi'], unavailableSessionIds: [], maxSessions: null, active: true, color: TEACHER_COLOR_PALETTE[7].hex },
  { id: 't9', code: '09', name: 'Dedi Kurniawan, S.Pd.', nip: '198612032011011006', subjects: ['Sejarah'], unavailableSessionIds: [], maxSessions: null, active: true, color: TEACHER_COLOR_PALETTE[8].hex },
  { id: 't10', code: '10', name: 'Maya Puspita, S.Pd.', nip: '199108212019032008', subjects: ['PPKn'], unavailableSessionIds: [], maxSessions: null, active: true, color: TEACHER_COLOR_PALETTE[9].hex },
  { id: 't11', code: '11', name: 'Fajar Nugroho, S.Kom.', nip: '199205142019031004', subjects: ['Informatika'], unavailableSessionIds: [], maxSessions: null, active: true, color: TEACHER_COLOR_PALETTE[10].hex },
  { id: 't12', code: '12', name: 'Lina Marlina, S.Ag.', nip: '198210092008012007', subjects: ['Pendidikan Agama'], unavailableSessionIds: [], maxSessions: null, active: true, color: TEACHER_COLOR_PALETTE[11].hex },
  { id: 't13', code: '13', name: 'Yusuf Maulana, S.Pd.', nip: '199303182020121005', subjects: ['PJOK'], unavailableSessionIds: [], maxSessions: null, active: true, color: TEACHER_COLOR_PALETTE[12].hex },
  { id: 't14', code: '14', name: 'Ratna Sari, S.Sn.', nip: '199401272020122009', subjects: ['Seni Budaya'], unavailableSessionIds: [], maxSessions: null, active: true, color: TEACHER_COLOR_PALETTE[13].hex },
];

export const DEFAULT_ROOMS: Room[] = [
  { id: 'r1', code: 'R-01', name: 'Ruang 01', location: 'Kelas X-A', capacity: 32, proctorsRequired: 1 },
  { id: 'r2', code: 'R-02', name: 'Ruang 02', location: 'Kelas X-B', capacity: 32, proctorsRequired: 1 },
  { id: 'r3', code: 'R-03', name: 'Ruang 03', location: 'Kelas XI-A', capacity: 34, proctorsRequired: 1 },
  { id: 'r4', code: 'R-04', name: 'Ruang 04', location: 'Kelas XI-B', capacity: 34, proctorsRequired: 1 },
  { id: 'r5', code: 'R-05', name: 'Ruang 05', location: 'Kelas XII-A', capacity: 30, proctorsRequired: 1 },
  { id: 'r6', code: 'R-06', name: 'Ruang 06', location: 'Kelas XII-B', capacity: 30, proctorsRequired: 1 },
];

export const DEFAULT_SESSIONS: ExamSession[] = [
  { id: 's1', dayLabel: 'Senin', date: '2026-11-30', sessionNumber: 1, shiftGroup: 'Sesi 1', timeRange: '07.30 – 09.30', subject: 'Bahasa Indonesia', gradeLevel: 'X / XI / XII' },
  { id: 's2', dayLabel: 'Senin', date: '2026-11-30', sessionNumber: 2, shiftGroup: 'Sesi 1', timeRange: '10.00 – 12.00', subject: 'Pendidikan Agama', gradeLevel: 'X / XI / XII' },
  { id: 's3', dayLabel: 'Selasa', date: '2026-12-01', sessionNumber: 1, shiftGroup: 'Sesi 1', timeRange: '07.30 – 09.30', subject: 'Matematika', gradeLevel: 'X / XI / XII' },
  { id: 's4', dayLabel: 'Selasa', date: '2026-12-01', sessionNumber: 2, shiftGroup: 'Sesi 1', timeRange: '10.00 – 12.00', subject: 'PPKn', gradeLevel: 'X / XI / XII' },
  { id: 's5', dayLabel: 'Rabu', date: '2026-12-02', sessionNumber: 1, shiftGroup: 'Sesi 1', timeRange: '07.30 – 09.30', subject: 'Bahasa Inggris', gradeLevel: 'X / XI / XII' },
  { id: 's6', dayLabel: 'Rabu', date: '2026-12-02', sessionNumber: 2, shiftGroup: 'Sesi 1', timeRange: '10.00 – 12.00', subject: 'Sejarah', gradeLevel: 'X / XI / XII' },
  { id: 's7', dayLabel: 'Kamis', date: '2026-12-03', sessionNumber: 1, shiftGroup: 'Sesi 1', timeRange: '07.30 – 09.30', subject: 'Fisika / Ekonomi', gradeLevel: 'X / XI / XII' },
  { id: 's8', dayLabel: 'Kamis', date: '2026-12-03', sessionNumber: 2, shiftGroup: 'Sesi 1', timeRange: '10.00 – 12.00', subject: 'Kimia / Sosiologi', gradeLevel: 'X / XI / XII' },
  { id: 's9', dayLabel: 'Jumat', date: '2026-12-04', sessionNumber: 1, shiftGroup: 'Sesi 1', timeRange: '07.30 – 09.30', subject: 'Biologi / Informatika', gradeLevel: 'X / XI / XII' },
  { id: 's10', dayLabel: 'Jumat', date: '2026-12-04', sessionNumber: 2, shiftGroup: 'Sesi 1', timeRange: '10.00 – 11.30', subject: 'Seni Budaya', gradeLevel: 'X / XI / XII' },
];

export const DEFAULT_SETTINGS: SchedulerSettings = {
  avoidOwnSubject: true,
  maxPerDayPerTeacher: 2,
  maxShiftsPerDayPerTeacher: 0,
  balanceLoad: true,
  scheduleEndDate: null,
  availableShifts: ['Sesi 1', 'Sesi 2'],
};

export const DEFAULT_APP_STATE: Omit<AppState, 'assignments'> = {
  identity: DEFAULT_IDENTITY,
  teachers: DEFAULT_TEACHERS,
  rooms: DEFAULT_ROOMS,
  sessions: DEFAULT_SESSIONS,
  settings: DEFAULT_SETTINGS,
  printConfig: {
    orientation: 'landscape',
    documentMode: 'matrix',
    displayMode: 'code_with_legend',
    showLegend: true,
    showSignature: true,
    showColors: true,
    filterShift: 'ALL',
    fontSize: 'normal',
  },
};
