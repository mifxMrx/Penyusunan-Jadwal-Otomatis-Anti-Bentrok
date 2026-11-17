import React from 'react';
import {
  Building2,
  CalendarRange,
  DoorOpen,
  Printer,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { ActiveTab } from '../types/schedule';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  schoolName: string;
  examTitle: string;
  teacherCount: number;
  roomCount: number;
  sessionCount: number;
  errorCount: number;
  emptyCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: ActiveTab;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'matrix',
    label: 'Matriks Jadwal',
    description: 'Susun & cek anti-bentrok',
    icon: CalendarRange,
  },
  {
    id: 'teachers',
    label: 'Data Pengawas',
    description: 'Guru, mapel & izin',
    icon: Users,
  },
  {
    id: 'rooms_sessions',
    label: 'Ruang & Jam Ujian',
    description: 'Ruangan, sesi, tanggal & jam',
    icon: DoorOpen,
  },
  {
    id: 'print_a4',
    label: 'Cetak & PDF A4',
    description: 'Pratinjau & ekspor resmi',
    icon: Printer,
  },
  {
    id: 'settings',
    label: 'Identitas Sekolah',
    description: 'Kop surat & cadangan data',
    icon: Building2,
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  schoolName,
  examTitle,
  teacherCount,
  roomCount,
  sessionCount,
  errorCount,
  emptyCount,
  mobileOpen,
  onCloseMobile,
}) => {
  const content = (
    <div className="flex h-full flex-col bg-white border-r border-slate-200 w-64 select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700 text-white shrink-0">
            <ShieldCheck className="h-4.5 w-4.5" />
          </div>
          <span className="text-base font-bold tracking-tight text-slate-900 truncate">
            SiJaga Ujian
          </span>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          aria-label="Tutup menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Active School Context */}
      <div className="px-5 py-4 border-b border-slate-100">
        <p className="text-xs font-medium text-slate-500 truncate">Sekolah Aktif</p>
        <p className="mt-0.5 text-sm font-semibold text-slate-900 truncate" title={schoolName}>
          {schoolName}
        </p>
        <p className="mt-0.5 text-xs text-slate-500 line-clamp-2 leading-relaxed" title={examTitle}>
          {examTitle}
        </p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Menu Utama">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectTab(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-800'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon
                className={`h-4.5 w-4.5 shrink-0 ${
                  isActive ? 'text-blue-700' : 'text-slate-400'
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className={`text-sm truncate ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {item.label}
                </div>
                <div className="text-xs text-slate-500 truncate">{item.description}</div>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Quiet Summary Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/70 space-y-2.5">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white border border-slate-200 rounded-md py-1.5 px-1">
            <div className="text-sm font-semibold font-mono tabular-nums text-slate-900">
              {teacherCount}
            </div>
            <div className="text-[11px] text-slate-500">Pengawas</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-md py-1.5 px-1">
            <div className="text-sm font-semibold font-mono tabular-nums text-slate-900">
              {roomCount}
            </div>
            <div className="text-[11px] text-slate-500">Ruang</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-md py-1.5 px-1">
            <div className="text-sm font-semibold font-mono tabular-nums text-slate-900">
              {sessionCount}
            </div>
            <div className="text-[11px] text-slate-500">Slot Jam</div>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-slate-500">Validasi Jadwal</span>
          {errorCount > 0 ? (
            <span className="font-semibold text-red-700 tabular-nums">
              {errorCount} Bentrok
            </span>
          ) : emptyCount > 0 ? (
            <span className="font-medium text-amber-700 tabular-nums">
              {emptyCount} Slot Kosong
            </span>
          ) : (
            <span className="font-semibold text-emerald-700">0 Bentrok</span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block shrink-0 no-print">{content}</aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{content}</div>
        </div>
      )}
    </>
  );
};
