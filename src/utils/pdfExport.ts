import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Assignment,
  ExamSession,
  PrintConfig,
  Room,
  SchoolIdentity,
  Teacher,
} from '../types/schedule';
import { getTeacherColorHex, hexToLightTintRgb, hexToRgbTuple } from './colors';
import { cellKey, formatIndonesianDate } from './scheduler';

interface ExportPdfParams {
  identity: SchoolIdentity;
  teachers: Teacher[];
  rooms: Room[];
  sessions: ExamSession[];
  assignments: Assignment[];
  printConfig: PrintConfig;
  teacherTotalCounts: Record<string, number>;
}

export function exportScheduleToPdfA4({
  identity,
  teachers,
  rooms,
  sessions,
  assignments,
  printConfig,
  teacherTotalCounts,
}: ExportPdfParams): void {
  const isLandscape = printConfig.orientation === 'landscape';
  const useColors = printConfig.showColors !== false;
  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 12;
  let cursorY = 12;

  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  const teacherIndexMap = new Map(teachers.map((t, idx) => [t.id, idx]));
  const assignmentMap = new Map<string, Assignment>();
  assignments.forEach((a) => {
    assignmentMap.set(cellKey(a.sessionId, a.roomId, a.proctorSlot), a);
  });

  // 1. Official Kop Surat (Letterhead)
  const logoSize = 18;
  const textCenterX = pageWidth / 2;

  if (identity.logoDataUrl) {
    try {
      doc.addImage(identity.logoDataUrl, 'PNG', marginX + 2, cursorY, logoSize, logoSize);
    } catch {
      // Ignore invalid image format silently
    }
  }

  doc.setTextColor(15, 23, 42);
  if (identity.institutionLine1.trim()) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(identity.institutionLine1.toUpperCase(), textCenterX, cursorY + 4, { align: 'center' });
    cursorY += 4.5;
  }

  if (identity.institutionLine2.trim()) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(identity.institutionLine2.toUpperCase(), textCenterX, cursorY + 4, { align: 'center' });
    cursorY += 4.5;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.text(identity.schoolName.toUpperCase(), textCenterX, cursorY + 5, { align: 'center' });
  cursorY += 6;

  if (identity.address.trim()) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(identity.address, textCenterX, cursorY + 4, { align: 'center' });
    cursorY += 5;
  }

  cursorY += 2;
  // Classic Indonesian double border rule
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.7);
  doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
  doc.setLineWidth(0.25);
  doc.line(marginX, cursorY + 1.1, pageWidth - marginX, cursorY + 1.1);
  cursorY += 6;

  // 2. Document Title
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(identity.examTitle.toUpperCase(), textCenterX, cursorY, { align: 'center' });
  cursorY += 4.5;

  const uniqueShifts = Array.from(new Set(sessions.map((s) => s.shiftGroup || 'Sesi 1')));
  const activeShiftFilter =
    printConfig.filterShift &&
    printConfig.filterShift !== 'ALL' &&
    uniqueShifts.includes(printConfig.filterShift)
      ? printConfig.filterShift
      : 'ALL';
  const filteredSessions =
    activeShiftFilter === 'ALL'
      ? sessions
      : sessions.filter((s) => (s.shiftGroup || 'Sesi 1') === activeShiftFilter);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(
    `TAHUN PELAJARAN ${identity.academicYear}${
      activeShiftFilter !== 'ALL' ? ` · ${activeShiftFilter.toUpperCase()}` : ''
    }`,
    textCenterX,
    cursorY,
    { align: 'center' }
  );
  cursorY += 5.5;

  const baseFontSize = printConfig.fontSize === 'compact' ? 7.2 : 8;

  if (printConfig.documentMode === 'matrix') {
    // 3A. Master Matrix Table
    const head = [
      [
        'No',
        'Hari / Tanggal',
        'Jam & Waktu',
        'Mata Pelajaran',
        ...rooms.map((r) => `${r.code}\n${r.location ? `(${r.location})` : r.name}`),
      ],
    ];

    const cellTeacherMap: Array<Array<Teacher | null>> = [];

    const body = filteredSessions.map((session, idx) => {
      const rowTeachers: Array<Teacher | null> = [];
      const roomCells = rooms.map((room) => {
        const names: string[] = [];
        let firstTeacher: Teacher | null = null;
        for (let slot = 0; slot < room.proctorsRequired; slot++) {
          const assign = assignmentMap.get(cellKey(session.id, room.id, slot));
          const t = assign?.teacherId ? teacherMap.get(assign.teacherId) ?? null : null;
          if (!firstTeacher && t) firstTeacher = t;
          if (!t) {
            names.push('-');
          } else if (printConfig.displayMode === 'code_with_legend') {
            names.push(t.code);
          } else {
            names.push(`${t.name}`);
          }
        }
        rowTeachers.push(firstTeacher);
        return names.join('\n');
      });
      cellTeacherMap.push(rowTeachers);

      return [
        String(idx + 1),
        `${session.dayLabel},\n${formatIndonesianDate(session.date, true)}`,
        `${session.shiftGroup ? `${session.shiftGroup}\n` : ''}Jam ke-${session.sessionNumber}\n${session.timeRange}`,
        `${session.subject}${session.gradeLevel ? `\n(${session.gradeLevel})` : ''}`,
        ...roomCells,
      ];
    });

    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX },
      head,
      body,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: baseFontSize,
        cellPadding: printConfig.fontSize === 'compact' ? 1.5 : 2,
        textColor: [15, 23, 42],
        lineColor: [148, 163, 184],
        lineWidth: 0.2,
        valign: 'middle',
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        halign: 'center',
        lineColor: [100, 116, 139],
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { cellWidth: isLandscape ? 28 : 24 },
        2: { halign: 'center', cellWidth: isLandscape ? 25 : 22 },
        3: { cellWidth: isLandscape ? 38 : 30 },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index >= 4) {
          data.cell.styles.halign =
            printConfig.displayMode === 'code_with_legend' ? 'center' : 'left';
          if (printConfig.displayMode === 'code_with_legend') {
            data.cell.styles.fontStyle = 'bold';
          }
          if (useColors) {
            const roomIdx = data.column.index - 4;
            const teacher = cellTeacherMap[data.row.index]?.[roomIdx];
            if (teacher) {
              const hex = getTeacherColorHex(teacher, teacherIndexMap.get(teacher.id) ?? 0);
              data.cell.styles.fillColor = hexToLightTintRgb(hex, 0.16);
              data.cell.styles.textColor = hexToRgbTuple(hex);
            }
          }
        }
      },
    });

    cursorY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY + 20;
    cursorY += 5;

    // 3B. Teacher Code Legend & Workload Recap
    if (printConfig.showLegend && teachers.length > 0) {
      if (cursorY > pageHeight - 55) {
        doc.addPage();
        cursorY = 14;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('DAFTAR KODE & REKAPITULASI TUGAS PENGAWAS', marginX, cursorY);
      cursorY += 2.5;

      const activeList = teachers.filter((t) => t.active);
      const half = Math.ceil(activeList.length / 2);
      const legendBody: string[][] = [];
      const legendPairs: Array<{ left: Teacher; right?: Teacher }> = [];

      for (let i = 0; i < half; i++) {
        const left = activeList[i];
        const right = activeList[i + half];
        legendPairs.push({ left, right });
        legendBody.push([
          left.code,
          left.name,
          left.nip || '-',
          String(teacherTotalCounts[left.id] ?? 0),
          right ? right.code : '',
          right ? right.name : '',
          right ? right.nip || '-' : '',
          right ? String(teacherTotalCounts[right.id] ?? 0) : '',
        ]);
      }

      autoTable(doc, {
        startY: cursorY,
        margin: { left: marginX, right: marginX },
        head: [['Kode', 'Nama Pengawas', 'NIP / NUPTK', 'Tugas', 'Kode', 'Nama Pengawas', 'NIP / NUPTK', 'Tugas']],
        body: legendBody,
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 7.2,
          cellPadding: 1.3,
          textColor: [15, 23, 42],
          lineColor: [148, 163, 184],
          lineWidth: 0.2,
        },
        headStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { halign: 'center', fontStyle: 'bold', cellWidth: 11 },
          3: { halign: 'center', cellWidth: 11 },
          4: { halign: 'center', fontStyle: 'bold', cellWidth: 11 },
          7: { halign: 'center', cellWidth: 11 },
        },
        didParseCell: (data) => {
          if (useColors && data.section === 'body') {
            const pair = legendPairs[data.row.index];
            if (data.column.index === 0 && pair?.left) {
              const hex = getTeacherColorHex(pair.left, teacherIndexMap.get(pair.left.id) ?? 0);
              data.cell.styles.fillColor = hexToLightTintRgb(hex, 0.2);
              data.cell.styles.textColor = hexToRgbTuple(hex);
            } else if (data.column.index === 4 && pair?.right) {
              const hex = getTeacherColorHex(pair.right, teacherIndexMap.get(pair.right.id) ?? 0);
              data.cell.styles.fillColor = hexToLightTintRgb(hex, 0.2);
              data.cell.styles.textColor = hexToRgbTuple(hex);
            }
          }
        },
      });

      cursorY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY + 20;
      cursorY += 6;
    }
  } else {
    // 3C. Per-Teacher Schedule Mode
    const activeList = teachers.filter((t) => t.active);
    const body = activeList.map((teacher, idx) => {
      const myDuties: string[] = [];
      for (const session of filteredSessions) {
        for (const room of rooms) {
          for (let slot = 0; slot < room.proctorsRequired; slot++) {
            const assign = assignmentMap.get(cellKey(session.id, room.id, slot));
            if (assign?.teacherId === teacher.id) {
              myDuties.push(
                `${session.dayLabel}, ${formatIndonesianDate(session.date, true)} · ${
                  session.shiftGroup ? `${session.shiftGroup} · ` : ''
                }Jam ke-${session.sessionNumber} (${session.timeRange}) · ${room.code} · ${session.subject}`
              );
            }
          }
        }
      }

      return [
        String(idx + 1),
        teacher.code,
        `${teacher.name}\nNIP: ${teacher.nip || '-'}`,
        String(myDuties.length),
        myDuties.length > 0 ? myDuties.join('\n') : 'Tidak ada jadwal mengawas',
      ];
    });

    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX },
      head: [['No', 'Kode', 'Nama Pengawas / NIP', 'Total', 'Rincian Jadwal Mengawas (Hari, Tanggal, Sesi, Jam, Ruang, Mapel)']],
      body,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: baseFontSize,
        cellPadding: 2,
        textColor: [15, 23, 42],
        lineColor: [148, 163, 184],
        lineWidth: 0.2,
        valign: 'top',
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 9 },
        1: { halign: 'center', fontStyle: 'bold', cellWidth: 14 },
        2: { cellWidth: isLandscape ? 58 : 48 },
        3: { halign: 'center', fontStyle: 'bold', cellWidth: 13 },
      },
      didParseCell: (data) => {
        if (useColors && data.section === 'body' && data.column.index === 1) {
          const teacher = activeList[data.row.index];
          if (teacher) {
            const hex = getTeacherColorHex(teacher, teacherIndexMap.get(teacher.id) ?? 0);
            data.cell.styles.fillColor = hexToLightTintRgb(hex, 0.2);
            data.cell.styles.textColor = hexToRgbTuple(hex);
          }
        }
      },
    });

    cursorY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY + 20;
    cursorY += 7;
  }

  // 4. Signature Block
  if (printConfig.showSignature) {
    if (cursorY > pageHeight - 40) {
      doc.addPage();
      cursorY = 16;
    }

    const leftSignX = marginX + 12;
    const rightSignX = pageWidth - marginX - 65;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);

    doc.text('Mengetahui,', leftSignX, cursorY);
    doc.text('Kepala Sekolah,', leftSignX, cursorY + 4.2);

    doc.text(`${identity.city}, ${identity.approvalDate}`, rightSignX, cursorY);
    doc.text('Ketua Panitia Ujian,', rightSignX, cursorY + 4.2);

    const nameY = cursorY + 21;
    doc.setFont('helvetica', 'bold');
    doc.text(identity.principalName, leftSignX, nameY);
    doc.text(identity.committeeChairName, rightSignX, nameY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`NIP. ${identity.principalNip || '-'}`, leftSignX, nameY + 4);
    doc.text(`NIP. ${identity.committeeChairNip || '-'}`, rightSignX, nameY + 4);
  }

  const safeTitle = identity.schoolName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const modeSuffix = printConfig.documentMode === 'matrix' ? 'matriks' : 'per-pengawas';
  doc.save(`jadwal-mengawas-${safeTitle}-${modeSuffix}-A4.pdf`);
}
