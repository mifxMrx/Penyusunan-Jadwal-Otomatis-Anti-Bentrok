import React, { useMemo } from 'react';
import { FileDown, Printer } from 'lucide-react';
import {
  Assignment,
  ExamSession,
  PrintConfig,
  Room,
  SchoolIdentity,
  Teacher,
} from '../types/schedule';
import { getTeacherColorHex, hexToRgba } from '../utils/colors';
import { cellKey, formatIndonesianDate } from '../utils/scheduler';
import { exportScheduleToPdfA4 } from '../utils/pdfExport';

interface PrintPreviewA4ViewProps {
  identity: SchoolIdentity;
  teachers: Teacher[];
  rooms: Room[];
  sessions: ExamSession[];
  assignments: Assignment[];
  printConfig: PrintConfig;
  teacherTotalCounts: Record<string, number>;
  onUpdatePrintConfig: (next: PrintConfig) => void;
}

export const PrintPreviewA4View: React.FC<PrintPreviewA4ViewProps> = ({
  identity,
  teachers,
  rooms,
  sessions,
  assignments,
  printConfig,
  teacherTotalCounts,
  onUpdatePrintConfig,
}) => {
  const teacherMap = useMemo(() => new Map(teachers.map((t) => [t.id, t])), [teachers]);
  const teacherIndexMap = useMemo(() => new Map(teachers.map((t, idx) => [t.id, idx])), [teachers]);
  const assignmentMap = useMemo(() => {
    const map = new Map<string, Assignment>();
    assignments.forEach((a) => map.set(cellKey(a.sessionId, a.roomId, a.proctorSlot), a));
    return map;
  }, [assignments]);

  const activeTeachers = useMemo(() => teachers.filter((t) => t.active), [teachers]);
  const useColors = printConfig.showColors !== false;

  const uniqueShifts = useMemo(() => {
    const list: string[] = [];
    sessions.forEach((s) => {
      const label = s.shiftGroup || 'Sesi 1';
      if (!list.includes(label)) list.push(label);
    });
    return list;
  }, [sessions]);

  const activeShiftFilter =
    printConfig.filterShift &&
    printConfig.filterShift !== 'ALL' &&
    uniqueShifts.includes(printConfig.filterShift)
      ? printConfig.filterShift
      : 'ALL';

  const printSessions = useMemo(() => {
    if (activeShiftFilter === 'ALL') return sessions;
    return sessions.filter((s) => (s.shiftGroup || 'Sesi 1') === activeShiftFilter);
  }, [sessions, activeShiftFilter]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = () => {
    exportScheduleToPdfA4({
      identity,
      teachers,
      rooms,
      sessions,
      assignments,
      printConfig,
      teacherTotalCounts,
    });
  };

  const isLandscape = printConfig.orientation === 'landscape';
  const compactText = printConfig.fontSize === 'compact';

  // Split active teachers into 2 columns for clean A4 legend
  const legendRows = useMemo(() => {
    const half = Math.ceil(activeTeachers.length / 2);
    const rows: Array<{ left: Teacher; right?: Teacher }> = [];
    for (let i = 0; i < half; i++) {
      rows.push({
        left: activeTeachers[i],
        right: activeTeachers[i + half],
      });
    }
    return rows;
  }, [activeTeachers]);

  return (
    <div className="space-y-5">
      {/* Dynamic @page orientation rule for browser Print A4 */}
      <style>
        {`@media print { @page { size: A4 ${printConfig.orientation}; margin: 12mm; } }`}
      </style>

      {/* Print & PDF Controls Bar (Hidden when printing) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 no-print">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Pengaturan Dokumen & Cetak Ukuran A4
            </h2>
            <p className="text-xs text-slate-500">
              Pratinjau langsung sesuai proporsi kertas A4 (210 × 297 mm) siap cetak atau ekspor ke file PDF.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm font-semibold hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              Print A4
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileDown className="h-4 w-4" />
              Export PDF (A4)
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Orientasi Kertas A4
            </label>
            <select
              value={printConfig.orientation}
              onChange={(e) =>
                onUpdatePrintConfig({
                  ...printConfig,
                  orientation: e.target.value as 'portrait' | 'landscape',
                })
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            >
              <option value="landscape">A4 Landscape (Melebar)</option>
              <option value="portrait">A4 Portrait (Tegak)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Jenis Dokumen
            </label>
            <select
              value={printConfig.documentMode}
              onChange={(e) =>
                onUpdatePrintConfig({
                  ...printConfig,
                  documentMode: e.target.value as 'matrix' | 'per_teacher',
                })
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            >
              <option value="matrix">Matriks Jadwal Lengkap</option>
              <option value="per_teacher">Rekap Jadwal Per Pengawas</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Filter Sesi Cetak
            </label>
            <select
              value={activeShiftFilter}
              onChange={(e) =>
                onUpdatePrintConfig({
                  ...printConfig,
                  filterShift: e.target.value,
                })
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            >
              <option value="ALL">Semua Sesi ({sessions.length} slot)</option>
              {uniqueShifts.map((shift) => (
                <option key={shift} value={shift}>
                  {shift}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Tampilan Sel Ruang
            </label>
            <select
              value={printConfig.displayMode}
              onChange={(e) =>
                onUpdatePrintConfig({
                  ...printConfig,
                  displayMode: e.target.value as 'code_with_legend' | 'full_name',
                })
              }
              disabled={printConfig.documentMode === 'per_teacher'}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none disabled:opacity-50"
            >
              <option value="code_with_legend">Kode Pengawas (G01, G02)</option>
              <option value="full_name">Nama Lengkap Guru</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Ukuran Teks Tabel
            </label>
            <select
              value={printConfig.fontSize}
              onChange={(e) =>
                onUpdatePrintConfig({
                  ...printConfig,
                  fontSize: e.target.value as 'normal' | 'compact',
                })
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            >
              <option value="normal">Normal (Standar A4)</option>
              <option value="compact">Padat (Banyak Ruang/Hari)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-sm text-slate-700">
          {printConfig.documentMode === 'matrix' && (
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={printConfig.showLegend}
                onChange={(e) =>
                  onUpdatePrintConfig({ ...printConfig, showLegend: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300 text-blue-700"
              />
              <span>Sertakan tabel daftar kode & rekap tugas pengawas</span>
            </label>
          )}
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useColors}
              onChange={(e) =>
                onUpdatePrintConfig({ ...printConfig, showColors: e.target.checked })
              }
              className="h-4 w-4 rounded border-slate-300 text-blue-700"
            />
            <span>Tampilkan warna pembeda tiap guru</span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={printConfig.showSignature}
              onChange={(e) =>
                onUpdatePrintConfig({ ...printConfig, showSignature: e.target.checked })
              }
              className="h-4 w-4 rounded border-slate-300 text-blue-700"
            />
            <span>Sertakan blok tanda tangan Kepala Sekolah & Ketua Panitia</span>
          </label>
        </div>
      </div>

      {/* Live A4 Paper Sheet Preview */}
      <div className="bg-slate-200/75 border border-slate-300 rounded-xl p-4 sm:p-8 overflow-x-auto print:bg-white print:border-0 print:p-0 print:overflow-visible">
        <div
          className={`a4-paper-preview mx-auto bg-white text-slate-950 shadow-sm border border-slate-300 ${
            isLandscape ? 'w-[297mm] min-h-[210mm]' : 'w-[210mm] min-h-[297mm]'
          } p-[12mm] box-border`}
        >
          {/* Official Kop Surat */}
          <div className="relative flex items-center justify-center pb-2.5 border-b-[3px] border-double border-slate-900">
            {identity.logoDataUrl && (
              <img
                src={identity.logoDataUrl}
                alt="Logo Sekolah"
                referrerPolicy="no-referrer"
                className="absolute left-1 top-0 h-16 w-16 object-contain"
              />
            )}
            <div className="text-center px-16">
              {identity.institutionLine1 && (
                <div className="text-[11px] font-bold tracking-wide uppercase leading-tight">
                  {identity.institutionLine1}
                </div>
              )}
              {identity.institutionLine2 && (
                <div className="text-[11px] font-bold tracking-wide uppercase leading-tight">
                  {identity.institutionLine2}
                </div>
              )}
              <div className="text-base font-bold tracking-tight uppercase mt-0.5 leading-tight">
                {identity.schoolName}
              </div>
              {identity.address && (
                <div className="text-[10px] text-slate-700 mt-0.5">{identity.address}</div>
              )}
            </div>
          </div>

          {/* Document Heading */}
          <div className="text-center my-4">
            <h1 className="text-[13px] font-bold uppercase tracking-tight">
              {identity.examTitle}
            </h1>
            <p className="text-[11px] font-medium mt-0.5">
              TAHUN PELAJARAN {identity.academicYear}
              {activeShiftFilter !== 'ALL' ? ` · ${activeShiftFilter.toUpperCase()}` : ''}
            </p>
          </div>

          {/* Matrix Document Table */}
          {printConfig.documentMode === 'matrix' ? (
            <div className="space-y-4">
              <table
                className={`w-full border-collapse border border-slate-700 ${
                  compactText ? 'text-[9.5px]' : 'text-[10.5px]'
                }`}
              >
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-700 px-1.5 py-1.5 text-center w-7">
                      No
                    </th>
                    <th className="border border-slate-700 px-2 py-1.5 text-left w-28">
                      Hari / Tanggal
                    </th>
                    <th className="border border-slate-700 px-2 py-1.5 text-center w-24">
                      Jam & Waktu
                    </th>
                    <th className="border border-slate-700 px-2 py-1.5 text-left w-36">
                      Mata Pelajaran
                    </th>
                    {rooms.map((r) => (
                      <th
                        key={r.id}
                        className="border border-slate-700 px-1.5 py-1.5 text-center"
                      >
                        <div className="font-bold font-mono">{r.code}</div>
                        {r.location && (
                          <div className="font-normal text-[8.5px] text-slate-600">
                            {r.location}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {printSessions.map((s, idx) => (
                    <tr key={s.id}>
                      <td className="border border-slate-700 px-1.5 py-1 text-center font-mono tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="border border-slate-700 px-2 py-1 leading-tight">
                        <div className="font-semibold">{s.dayLabel}</div>
                        <div className="font-mono tabular-nums text-[9.5px]">
                          {formatIndonesianDate(s.date, true)}
                        </div>
                      </td>
                      <td className="border border-slate-700 px-1.5 py-1 text-center font-mono tabular-nums leading-tight">
                        {(uniqueShifts.length > 1 || s.shiftGroup) && (
                          <div className="text-[8.5px] font-bold text-slate-700">
                            {s.shiftGroup || 'Sesi 1'}
                          </div>
                        )}
                        <div className="font-semibold">Jam ke-{s.sessionNumber}</div>
                        <div className="text-[9px]">{s.timeRange}</div>
                      </td>
                      <td className="border border-slate-700 px-2 py-1 leading-tight">
                        <div className="font-medium">{s.subject}</div>
                        {s.gradeLevel && (
                          <div className="text-[9px] text-slate-600">{s.gradeLevel}</div>
                        )}
                      </td>
                      {rooms.map((r) => {
                        const entries: Array<{ label: string; teacher: Teacher | null }> = [];
                        for (let slot = 0; slot < r.proctorsRequired; slot++) {
                          const a = assignmentMap.get(cellKey(s.id, r.id, slot));
                          const t = a?.teacherId ? teacherMap.get(a.teacherId) ?? null : null;
                          if (!t) {
                            entries.push({ label: '-', teacher: null });
                          } else if (printConfig.displayMode === 'code_with_legend') {
                            entries.push({ label: t.code, teacher: t });
                          } else {
                            entries.push({ label: t.name, teacher: t });
                          }
                        }
                        const primaryTeacher = entries.find((e) => e.teacher)?.teacher ?? null;
                        const primaryHex = primaryTeacher
                          ? getTeacherColorHex(
                              primaryTeacher,
                              teacherIndexMap.get(primaryTeacher.id) ?? 0
                            )
                          : null;

                        return (
                          <td
                            key={r.id}
                            className={`border border-slate-700 px-1.5 py-1 ${
                              printConfig.displayMode === 'code_with_legend'
                                ? 'text-center font-mono font-semibold'
                                : 'text-left'
                            }`}
                            style={
                              useColors && primaryHex
                                ? {
                                    backgroundColor: hexToRgba(primaryHex, 0.12),
                                    color: entries.length === 1 ? primaryHex : '#0f172a',
                                    printColorAdjust: 'exact',
                                    WebkitPrintColorAdjust: 'exact',
                                  }
                                : undefined
                            }
                          >
                            {entries.map((entry, i) => {
                              const entryHex = entry.teacher
                                ? getTeacherColorHex(
                                    entry.teacher,
                                    teacherIndexMap.get(entry.teacher.id) ?? 0
                                  )
                                : undefined;
                              return (
                                <div
                                  key={i}
                                  className="leading-snug"
                                  style={
                                    useColors && entryHex && entries.length > 1
                                      ? { color: entryHex, fontWeight: 600 }
                                      : undefined
                                  }
                                >
                                  {entry.label}
                                </div>
                              );
                            })}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Teacher Code Legend & Total Count */}
              {printConfig.showLegend && activeTeachers.length > 0 && (
                <div className="avoid-break pt-1">
                  <div className="text-[10px] font-bold uppercase mb-1.5">
                    Daftar Kode & Rekapitulasi Tugas Pengawas
                  </div>
                  <table className="w-full border-collapse border border-slate-700 text-[9.5px]">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-700 px-1.5 py-1 text-center w-11">
                          Kode
                        </th>
                        <th className="border border-slate-700 px-2 py-1 text-left">
                          Nama Pengawas
                        </th>
                        <th className="border border-slate-700 px-2 py-1 text-left">
                          NIP / NUPTK
                        </th>
                        <th className="border border-slate-700 px-1.5 py-1 text-center w-11">
                          Tugas
                        </th>
                        <th className="border border-slate-700 px-1.5 py-1 text-center w-11">
                          Kode
                        </th>
                        <th className="border border-slate-700 px-2 py-1 text-left">
                          Nama Pengawas
                        </th>
                        <th className="border border-slate-700 px-2 py-1 text-left">
                          NIP / NUPTK
                        </th>
                        <th className="border border-slate-700 px-1.5 py-1 text-center w-11">
                          Tugas
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {legendRows.map((row, idx) => {
                        const leftHex = getTeacherColorHex(
                          row.left,
                          teacherIndexMap.get(row.left.id) ?? 0
                        );
                        const rightHex = row.right
                          ? getTeacherColorHex(
                              row.right,
                              teacherIndexMap.get(row.right.id) ?? 0
                            )
                          : undefined;
                        return (
                          <tr key={idx}>
                            <td
                              className="border border-slate-700 px-1.5 py-0.5 text-center font-mono font-bold"
                              style={
                                useColors
                                  ? {
                                      backgroundColor: hexToRgba(leftHex, 0.16),
                                      color: leftHex,
                                      printColorAdjust: 'exact',
                                      WebkitPrintColorAdjust: 'exact',
                                    }
                                  : undefined
                              }
                            >
                              {row.left.code}
                            </td>
                            <td className="border border-slate-700 px-2 py-0.5">
                              {row.left.name}
                            </td>
                            <td className="border border-slate-700 px-2 py-0.5 font-mono tabular-nums">
                              {row.left.nip || '-'}
                            </td>
                            <td className="border border-slate-700 px-1.5 py-0.5 text-center font-mono tabular-nums">
                              {teacherTotalCounts[row.left.id] ?? 0}
                            </td>
                            <td
                              className="border border-slate-700 px-1.5 py-0.5 text-center font-mono font-bold"
                              style={
                                useColors && rightHex
                                  ? {
                                      backgroundColor: hexToRgba(rightHex, 0.16),
                                      color: rightHex,
                                      printColorAdjust: 'exact',
                                      WebkitPrintColorAdjust: 'exact',
                                    }
                                  : undefined
                              }
                            >
                              {row.right?.code ?? ''}
                            </td>
                            <td className="border border-slate-700 px-2 py-0.5">
                              {row.right?.name ?? ''}
                            </td>
                            <td className="border border-slate-700 px-2 py-0.5 font-mono tabular-nums">
                              {row.right ? row.right.nip || '-' : ''}
                            </td>
                            <td className="border border-slate-700 px-1.5 py-0.5 text-center font-mono tabular-nums">
                              {row.right ? teacherTotalCounts[row.right.id] ?? 0 : ''}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* Per-Teacher Schedule Mode */
            <table
              className={`w-full border-collapse border border-slate-700 ${
                compactText ? 'text-[9.5px]' : 'text-[10.5px]'
              }`}
            >
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-700 px-1.5 py-1.5 text-center w-8">
                    No
                  </th>
                  <th className="border border-slate-700 px-1.5 py-1.5 text-center w-12">
                    Kode
                  </th>
                  <th className="border border-slate-700 px-2 py-1.5 text-left w-52">
                    Nama Pengawas / NIP
                  </th>
                  <th className="border border-slate-700 px-1.5 py-1.5 text-center w-12">
                    Total
                  </th>
                  <th className="border border-slate-700 px-2 py-1.5 text-left">
                    Rincian Jadwal Mengawas (Hari, Tanggal, Sesi, Jam, Ruang, Mata Pelajaran)
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeTeachers.map((teacher, idx) => {
                  const duties: string[] = [];
                  for (const s of printSessions) {
                    for (const r of rooms) {
                      for (let slot = 0; slot < r.proctorsRequired; slot++) {
                        const a = assignmentMap.get(cellKey(s.id, r.id, slot));
                        if (a?.teacherId === teacher.id) {
                          duties.push(
                            `${s.dayLabel}, ${formatIndonesianDate(s.date, true)} · ${
                              s.shiftGroup ? `${s.shiftGroup} · ` : ''
                            }Jam ke-${s.sessionNumber} (${s.timeRange}) · ${r.code} · ${s.subject}`
                          );
                        }
                      }
                    }
                  }

                  const teacherHex = getTeacherColorHex(
                    teacher,
                    teacherIndexMap.get(teacher.id) ?? 0
                  );
                  return (
                    <tr key={teacher.id}>
                      <td className="border border-slate-700 px-1.5 py-1.5 text-center font-mono tabular-nums align-top">
                        {idx + 1}
                      </td>
                      <td
                        className="border border-slate-700 px-1.5 py-1.5 text-center font-mono font-bold align-top"
                        style={
                          useColors
                            ? {
                                backgroundColor: hexToRgba(teacherHex, 0.16),
                                color: teacherHex,
                                printColorAdjust: 'exact',
                                WebkitPrintColorAdjust: 'exact',
                              }
                            : undefined
                        }
                      >
                        {teacher.code}
                      </td>
                      <td className="border border-slate-700 px-2 py-1.5 align-top">
                        <div className="font-semibold">{teacher.name}</div>
                        <div className="text-[9px] font-mono tabular-nums text-slate-600">
                          NIP. {teacher.nip || '-'}
                        </div>
                      </td>
                      <td className="border border-slate-700 px-1.5 py-1.5 text-center font-mono font-semibold tabular-nums align-top">
                        {duties.length}
                      </td>
                      <td className="border border-slate-700 px-2 py-1.5 align-top">
                        {duties.length === 0 ? (
                          <span className="text-slate-500 italic">Tidak ada tugas</span>
                        ) : (
                          <ul className="space-y-0.5">
                            {duties.map((d, i) => (
                              <li key={i}>{d}</li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Official Signature Block */}
          {printConfig.showSignature && (
            <div className="avoid-break mt-6 grid grid-cols-2 gap-8 text-[10.5px] px-4">
              <div>
                <div>Mengetahui,</div>
                <div>Kepala Sekolah,</div>
                <div className="h-14" />
                <div className="font-bold underline underline-offset-2">
                  {identity.principalName}
                </div>
                <div className="font-mono text-[9.5px] tabular-nums">
                  NIP. {identity.principalNip || '-'}
                </div>
              </div>

              <div className="pl-12">
                <div>
                  {identity.city}, {identity.approvalDate}
                </div>
                <div>Ketua Panitia Ujian,</div>
                <div className="h-14" />
                <div className="font-bold underline underline-offset-2">
                  {identity.committeeChairName}
                </div>
                <div className="font-mono text-[9.5px] tabular-nums">
                  NIP. {identity.committeeChairNip || '-'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
