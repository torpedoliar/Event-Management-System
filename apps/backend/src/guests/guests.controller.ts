import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Patch,
  Request,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthService } from '../auth/auth.service';
import { photosStorage } from '../common/storage';
import { CreateGuestDto, BulkDeleteGuestsDto, BulkUpdateGuestsDto, GuestCategory } from './dto/create-guest.dto';
import { QueryGuestsDto } from './dto/query-guests.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { GuestsService } from './guests.service';
import * as multer from 'multer';
import { parseString } from '@fast-csv/parse';
import type { Request as ExpressRequest } from 'express';
import { emitEvent } from '../common/sse';
import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

@Controller()
export class GuestsController {
  constructor(
    private readonly guests: GuestsService,
    private readonly auth: AuthService,
  ) { }

  @UseGuards(JwtAuthGuard)
  @Get('guests')
  list(@Query() query: QueryGuestsDto) {
    return this.guests.list(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('guests/cursor')
  listCursor(@Query() query: QueryGuestsDto) {
    return this.guests.listCursor(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('guests/stats')
  stats(@Query('eventId') eventId?: string) {
    return this.guests.stats(eventId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('guests/stats/company')
  companyStats(@Query('eventId') eventId?: string) {
    return this.guests.companyStats(eventId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('guests/template')
  async downloadTemplate(@Res() res: Response) {
    try {
      const headers = ['guest_id', 'name', 'table_location', 'email', 'company', 'department', 'division', 'category', 'notes'];
      const example1 = ['G001', 'Budi Santoso', 'Meja 1', 'budi@email.com', 'PT Contoh', 'IT', 'Engineering', 'VIP', 'Catatan opsional'];
      const example2 = ['G002', 'Siti Rahayu', '-', '', 'PT Lainnya', '', '', 'REGULAR', ''];

      const ws = XLSX.utils.aoa_to_sheet([headers, example1, example2]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template Import Tamu');

      // Auto-width columns
      ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length, 15) }));

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="template_import_tamu.xlsx"',
        'Content-Length': buffer.length,
      });

      res.send(buffer);
    } catch (error: any) {
      console.error('Template download error:', error);
      res.status(500).json({
        error: 'Gagal membuat template',
        message: error.message || 'Terjadi kesalahan saat membuat file template Excel.',
      });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('guests/export')
  async exportXlsx(@Res() res: Response, @Query('eventId') eventId?: string) {
    try {
      const pageSize = 1000;
      let page = 1;

      // Get active event if no eventId provided
      let activeEventId = eventId;
      let eventName = 'guests';
      if (!activeEventId) {
        const activeEvent = await this.guests.getActiveEvent();
        if (!activeEvent) {
          res.status(400).json({
            error: 'Tidak ada event aktif',
            message: 'Silakan aktifkan event terlebih dahulu sebelum export data tamu.'
          });
          return;
        }
        activeEventId = activeEvent.id;
        eventName = activeEvent.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'guests';
      }

      // Collect all guest data
      const allGuests: any[] = [];
      while (true) {
        const { data } = await this.guests.list({ page, pageSize, eventId: activeEventId });
        if (!data.length) break;
        allGuests.push(...data);
        page++;
      }

      // Check if there's any data
      if (allGuests.length === 0) {
        res.status(404).json({
          error: 'Data kosong',
          message: 'Tidak ada data tamu untuk di-export. Silakan tambahkan tamu terlebih dahulu.'
        });
        return;
      }

      // Build data rows for XLSX
      const rows = allGuests.map((g: any) => ({
        'guest_id': g.guestId,
        'name': g.name,
        'table_location': g.tableLocation,
        'email': g.email ?? '',
        'company': g.company ?? '',
        'department': g.department ?? '',
        'division': g.division ?? '',
        'category': g.category ?? 'REGULAR',
        'registration_source': g.registrationSource ?? 'MANUAL',
        'notes': g.notes ?? '',
      }));

      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Guests');

      // Generate buffer
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const filename = `data_tamu_${eventName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error: any) {
      console.error('Export error:', error);
      res.status(500).json({
        error: 'Gagal export',
        message: error.message || 'Terjadi kesalahan saat mengexport data tamu.'
      });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('guests/export/full')
  async exportFullXlsx(@Res() res: Response, @Query('eventId') eventId?: string) {
    try {
      const pageSize = 1000;
      let page = 1;

      // Get event info for the export
      let eventName = '';
      let activeEventId = eventId;
      if (!activeEventId) {
        const activeEvent = await this.guests.getActiveEvent();
        if (!activeEvent) {
          res.status(400).json({
            error: 'Tidak ada event aktif',
            message: 'Silakan aktifkan event terlebih dahulu sebelum export laporan.'
          });
          return;
        }
        activeEventId = activeEvent.id;
        eventName = activeEvent.name;
      } else {
        const event = await this.guests.getEventById(eventId!);
        if (!event) {
          res.status(404).json({
            error: 'Event tidak ditemukan',
            message: 'Event dengan ID tersebut tidak ditemukan.'
          });
          return;
        }
        eventName = event.name || '';
      }

      // Collect all guest data with related info
      const allGuests: any[] = [];
      while (true) {
        const { data } = await this.guests.listWithFullRelations({ page, pageSize, eventId: activeEventId });
        if (!data.length) break;
        allGuests.push(...data);
        page++;
      }

      // Check if there's any data
      if (allGuests.length === 0) {
        res.status(404).json({
          error: 'Data kosong',
          message: 'Tidak ada data tamu untuk di-export. Silakan tambahkan tamu terlebih dahulu.'
        });
        return;
      }

      // Helper to format registration source
      const formatSource = (source: string | null | undefined): string => {
        switch (source) {
          case 'MANUAL': return 'Manual (Admin)';
          case 'IMPORT': return 'Import Excel';
          case 'WALKIN': return 'Walk-in (Check-in)';
          default: return 'Manual (Admin)';
        }
      };

      // Build guest data rows
      const guestRows = allGuests.map((g: any) => ({
        'No. Antrian': g.queueNumber ?? '',
        'Guest ID': g.guestId,
        'Nama': g.name,
        'Email': g.email ?? '',
        'Kategori': g.category ?? 'REGULAR',
        'Sumber Registrasi': formatSource(g.registrationSource),
        'Meja/Ruangan': g.tableLocation,
        'Perusahaan': g.company ?? '',
        'Departemen': g.department ?? '',
        'Divisi': g.division ?? '',
        'Catatan': g.notes ?? '',
        'Check-in': g.checkedIn ? 'Ya' : 'Tidak',
        'Jumlah Check-in': g.checkinCount ?? (g.checkedIn ? 1 : 0),
        'Waktu Check-in': formatLocalTime(g.checkedInAt),
        'Check-in Oleh': g.checkins?.map((c: any) => c.checkinByName).filter(Boolean).join(', ') || g.checkedInByName || '',
        'Detail Check-in': g.checkins?.map((c: any) => `${c.checkinByName || 'Admin'} (${formatLocalTime(c.checkinAt)})`).join('; ') || '',
        'Souvenir Diambil': g.souvenirTaken ? 'Ya' : 'Tidak',
        'Souvenir': g.souvenirTakes?.map((st: any) => st.souvenir?.name).filter(Boolean).join(', ') || '',
        'Souvenir Diberikan Oleh': g.souvenirTakes?.map((st: any) => st.takenByName).filter(Boolean).join(', ') || '',
        'Waktu Ambil Souvenir': g.souvenirTakes?.map((st: any) => formatLocalTime(st.takenAt)).filter(Boolean).join(', ') || '',
        'Hadiah Lucky Draw': g.prizeWins?.map((pw: any) => pw.prize?.name).filter(Boolean).join(', ') || '',
        'Status Hadiah': g.prizeWins?.map((pw: any) => pw.collection ? 'Diambil' : 'Belum').filter(Boolean).join(', ') || '',
        'Hadiah Diambil Oleh': g.prizeWins?.map((pw: any) => pw.collection?.collectedByName).filter(Boolean).join(', ') || '',
        'Waktu Ambil Hadiah': g.prizeWins?.map((pw: any) => pw.collection ? formatLocalTime(pw.collection.collectedAt) : '').filter(Boolean).join(', ') || '',
        'Event': eventName,
      }));

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Sheet 1: Guest Data
      const ws1 = XLSX.utils.json_to_sheet(guestRows);
      XLSX.utils.book_append_sheet(wb, ws1, 'Tamu');

      // Sheet 2: Prize Winners Summary
      const prizeWinners = allGuests.flatMap((g: any) =>
        (g.prizeWins || []).map((pw: any) => ({
          'Guest ID': g.guestId,
          'Nama Tamu': g.name,
          'Hadiah': pw.prize?.name || '',
          'Kategori': pw.prize?.category === 'UTAMA' ? 'Hadiah Utama' : 'Hadiah Hiburan',
          'Waktu Menang': formatLocalTime(pw.wonAt),
          'Status': pw.collection ? 'Sudah Diambil' : 'Belum Diambil',
          'Diambil Pada': pw.collection ? formatLocalTime(pw.collection.collectedAt) : '',
          'Diambil Oleh': pw.collection?.collectedByName || '',
        }))
      );
      if (prizeWinners.length > 0) {
        const ws2 = XLSX.utils.json_to_sheet(prizeWinners);
        XLSX.utils.book_append_sheet(wb, ws2, 'Pemenang Lucky Draw');
      }

      // Sheet 3: Souvenir Distribution
      const souvenirTakes = allGuests.flatMap((g: any) =>
        (g.souvenirTakes || []).map((st: any) => ({
          'Guest ID': g.guestId,
          'Nama Tamu': g.name,
          'Souvenir': st.souvenir?.name || '',
          'Waktu Ambil': formatLocalTime(st.takenAt),
          'Diberikan Oleh': st.takenByName || '',
        }))
      );
      if (souvenirTakes.length > 0) {
        const ws3 = XLSX.utils.json_to_sheet(souvenirTakes);
        XLSX.utils.book_append_sheet(wb, ws3, 'Pengambilan Souvenir');
      }

      // Generate buffer
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const filename = `laporan_event_${eventName.replace(/[^a-zA-Z0-9]/g, '_') || 'export'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error: any) {
      console.error('Export full error:', error);
      res.status(500).json({
        error: 'Gagal export laporan',
        message: error.message || 'Terjadi kesalahan saat mengexport laporan event.'
      });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('guests/export/pdf')
  async exportPdf(@Res() res: Response, @Query('eventId') eventId?: string) {
    const pageSize = 1000;
    let page = 1;

    // Get event info
    let eventName = '';
    let eventDate = '';
    let eventTime = '';
    let eventLocation = '';
    let activeEventId = eventId;
    if (!activeEventId) {
      const activeEvent = await this.guests.getActiveEvent();
      if (activeEvent) {
        activeEventId = activeEvent.id;
        eventName = activeEvent.name;
        eventDate = activeEvent.date ? new Date(activeEvent.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';
        eventTime = activeEvent.time || '';
        eventLocation = activeEvent.location || '';
      }
    } else {
      const event = await this.guests.getEventById(eventId!);
      eventName = event?.name || '';
      eventDate = event?.date ? new Date(event.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';
      eventTime = event?.time || '';
      eventLocation = event?.location || '';
    }

    // Collect all guest data
    const allGuests: any[] = [];
    while (true) {
      const { data } = await this.guests.listWithFullRelations({ page, pageSize, eventId: activeEventId });
      if (!data.length) break;
      allGuests.push(...data);
      page++;
    }

    // Sort guests by queue number
    allGuests.sort((a, b) => a.queueNumber - b.queueNumber);

    // Create PDF document - landscape for better table layout
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 30,
      bufferPages: true
    });

    // Set response headers
    const filename = `laporan_${eventName.replace(/[^a-zA-Z0-9]/g, '_') || 'event'}_${new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    const pageWidth = doc.page.width - 60;
    const marginLeft = 30;

    // ===== HEADER =====
    const drawHeader = () => {
      // Header background
      doc.save();
      doc.rect(0, 0, doc.page.width, 80).fill('#1e293b');
      doc.restore();

      // Title
      doc.fontSize(22).font('Helvetica-Bold').fillColor('#ffffff')
        .text('LAPORAN DATA TAMU', marginLeft, 20, { width: pageWidth });

      // Event info
      doc.fontSize(12).font('Helvetica').fillColor('#94a3b8')
        .text(eventName || 'Event', marginLeft, 45);

      const eventInfoParts = [eventDate, eventTime ? `${eventTime} WIB` : '', eventLocation].filter(Boolean);
      if (eventInfoParts.length > 0) {
        doc.fontSize(9).fillColor('#64748b')
          .text(eventInfoParts.join(' • '), marginLeft, 60);
      }

      // Export timestamp (right side)
      doc.fontSize(8).fillColor('#64748b')
        .text(`Diekspor: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`,
          doc.page.width - 200, 60, { width: 170, align: 'right' });
    };

    drawHeader();

    // ===== STATISTICS BOXES =====
    const totalGuests = allGuests.length;
    const checkedInCount = allGuests.filter(g => g.checkedIn).length;
    const notCheckedInCount = totalGuests - checkedInCount;
    const souvenirCount = allGuests.filter(g => g.souvenirTaken).length;
    const prizeWinnersCount = allGuests.filter(g => g.prizeWins && g.prizeWins.length > 0).length;
    const checkinPercent = totalGuests > 0 ? Math.round((checkedInCount / totalGuests) * 100) : 0;

    const boxY = 95;
    const boxHeight = 50;
    const boxWidth = (pageWidth - 40) / 5;

    const drawStatBox = (x: number, label: string, value: string | number, color: string, subtext?: string) => {
      doc.save();
      doc.roundedRect(x, boxY, boxWidth, boxHeight, 6).fill(color);
      doc.fontSize(10).font('Helvetica').fillColor('#ffffff').opacity(0.8)
        .text(label, x + 10, boxY + 8, { width: boxWidth - 20 });
      doc.fontSize(20).font('Helvetica-Bold').fillColor('#ffffff').opacity(1)
        .text(String(value), x + 10, boxY + 22, { width: boxWidth - 20 });
      if (subtext) {
        doc.fontSize(8).font('Helvetica').fillColor('#ffffff').opacity(0.7)
          .text(subtext, x + 10, boxY + 38, { width: boxWidth - 20 });
      }
      doc.restore();
    };

    drawStatBox(marginLeft, 'Total Tamu', totalGuests, '#3b82f6');
    drawStatBox(marginLeft + boxWidth + 10, 'Sudah Check-in', checkedInCount, '#22c55e', `${checkinPercent}%`);
    drawStatBox(marginLeft + (boxWidth + 10) * 2, 'Belum Check-in', notCheckedInCount, '#f59e0b');
    drawStatBox(marginLeft + (boxWidth + 10) * 3, 'Ambil Souvenir', souvenirCount, '#8b5cf6');
    drawStatBox(marginLeft + (boxWidth + 10) * 4, 'Pemenang Hadiah', prizeWinnersCount, '#ec4899');

    // ===== GUEST TABLE =====
    doc.moveDown(1);
    let tableY = boxY + boxHeight + 20;

    // Helper to format registration source for PDF
    const formatSourcePdf = (source: string | null | undefined): string => {
      switch (source) {
        case 'MANUAL': return 'Manual';
        case 'IMPORT': return 'Import';
        case 'WALKIN': return 'Walk-in';
        default: return 'Manual';
      }
    };

    // Table columns
    const cols = [
      { label: 'No', width: 28, align: 'center' as const },
      { label: 'ID', width: 55, align: 'left' as const },
      { label: 'Nama', width: 90, align: 'left' as const },
      { label: 'Email', width: 85, align: 'left' as const },
      { label: 'Perusahaan', width: 70, align: 'left' as const },
      { label: 'Meja', width: 40, align: 'center' as const },
      { label: 'Kategori', width: 45, align: 'center' as const },
      { label: 'Sumber', width: 45, align: 'center' as const },
      { label: 'Status', width: 50, align: 'center' as const },
      { label: 'Jml CI', width: 35, align: 'center' as const },
      { label: 'Waktu Check-in', width: 75, align: 'center' as const },
      { label: 'Check-in Oleh', width: 100, align: 'left' as const },
      { label: 'Souvenir', width: 50, align: 'center' as const },
    ];

    const rowHeight = 22;
    const headerHeight = 28;

    const drawTableHeader = (y: number) => {
      // Header background
      doc.save();
      doc.rect(marginLeft, y, pageWidth, headerHeight).fill('#334155');
      doc.restore();

      let colX = marginLeft;
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
      for (const col of cols) {
        doc.text(col.label, colX + 4, y + 9, { width: col.width - 8, align: col.align });
        colX += col.width;
      }
      return y + headerHeight;
    };

    const drawTableRow = (y: number, guest: any, index: number, isEven: boolean) => {
      // Row background
      doc.save();
      doc.rect(marginLeft, y, pageWidth, rowHeight).fill(isEven ? '#f8fafc' : '#ffffff');
      // Bottom border
      doc.moveTo(marginLeft, y + rowHeight).lineTo(marginLeft + pageWidth, y + rowHeight).stroke('#e2e8f0');
      doc.restore();

      let colX = marginLeft;
      doc.fontSize(8).font('Helvetica').fillColor('#374151');

      // No
      doc.text(String(guest.queueNumber || index + 1), colX + 4, y + 7, { width: cols[0].width - 8, align: 'center' });
      colX += cols[0].width;

      // ID
      doc.font('Helvetica').fillColor('#3b82f6')
        .text(truncateText(guest.guestId, 10), colX + 4, y + 7, { width: cols[1].width - 8 });
      colX += cols[1].width;

      // Nama
      doc.font('Helvetica-Bold').fillColor('#1e293b')
        .text(truncateText(guest.name, 18), colX + 4, y + 7, { width: cols[2].width - 8 });
      colX += cols[2].width;

      // Email
      doc.font('Helvetica').fillColor('#64748b')
        .text(truncateText(guest.email || '-', 18), colX + 4, y + 7, { width: cols[3].width - 8 });
      colX += cols[3].width;

      // Perusahaan
      doc.font('Helvetica').fillColor('#64748b')
        .text(truncateText(guest.company || '-', 15), colX + 4, y + 7, { width: cols[4].width - 8 });
      colX += cols[4].width;

      // Meja
      doc.fillColor('#374151')
        .text(truncateText(guest.tableLocation, 8), colX + 4, y + 7, { width: cols[5].width - 8, align: 'center' });
      colX += cols[5].width;

      // Kategori
      const catColor = guest.category === 'VVIP' ? '#dc2626' : guest.category === 'VIP' ? '#f59e0b' : '#6b7280';
      doc.fillColor(catColor)
        .text(guest.category || 'REGULAR', colX + 4, y + 7, { width: cols[6].width - 8, align: 'center' });
      colX += cols[6].width;

      // Sumber Registrasi
      const sourceText = formatSourcePdf(guest.registrationSource);
      const sourceColor = guest.registrationSource === 'WALKIN' ? '#f97316' : guest.registrationSource === 'IMPORT' ? '#3b82f6' : '#6b7280';
      doc.fillColor(sourceColor)
        .text(sourceText, colX + 4, y + 7, { width: cols[7].width - 8, align: 'center' });
      colX += cols[7].width;

      // Status
      if (guest.checkedIn) {
        doc.save();
        doc.roundedRect(colX + 6, y + 4, cols[8].width - 12, 14, 3).fill('#22c55e');
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#ffffff')
          .text('HADIR', colX + 6, y + 7, { width: cols[8].width - 12, align: 'center' });
        doc.restore();
      } else {
        doc.save();
        doc.roundedRect(colX + 6, y + 4, cols[8].width - 12, 14, 3).fill('#ef4444');
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#ffffff')
          .text('BELUM', colX + 6, y + 7, { width: cols[8].width - 12, align: 'center' });
        doc.restore();
      }
      colX += cols[8].width;

      // Jumlah Check-in
      const checkinCount = guest.checkinCount ?? (guest.checkedIn ? 1 : 0);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(checkinCount > 1 ? '#8b5cf6' : '#374151')
        .text(String(checkinCount), colX + 4, y + 7, { width: cols[9].width - 8, align: 'center' });
      colX += cols[9].width;

      // Waktu Check-in
      doc.font('Helvetica').fontSize(8).fillColor('#64748b')
        .text(guest.checkedInAt ? formatLocalTime(guest.checkedInAt) : '-', colX + 4, y + 7, { width: cols[10].width - 8, align: 'center' });
      colX += cols[10].width;

      // Check-in Oleh (show all admins if multiple check-ins)
      const checkinAdmins = guest.checkins?.map((c: any) => c.checkinByName).filter(Boolean).join(', ') || guest.checkedInByName || '-';
      doc.fillColor('#64748b')
        .text(truncateText(checkinAdmins, 18), colX + 4, y + 7, { width: cols[11].width - 8 });
      colX += cols[11].width;

      // Souvenir
      if (guest.souvenirTaken) {
        doc.save();
        doc.roundedRect(colX + 10, y + 4, cols[12].width - 20, 14, 3).fill('#8b5cf6');
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#ffffff')
          .text('YA', colX + 10, y + 7, { width: cols[12].width - 20, align: 'center' });
        doc.restore();
      } else {
        doc.fontSize(8).font('Helvetica').fillColor('#94a3b8')
          .text('-', colX + 4, y + 7, { width: cols[12].width - 8, align: 'center' });
      }
    };

    // Draw table
    tableY = drawTableHeader(tableY);

    for (let i = 0; i < allGuests.length; i++) {
      // Check if we need a new page
      if (tableY + rowHeight > doc.page.height - 50) {
        doc.addPage();
        drawHeader();
        tableY = 95;
        tableY = drawTableHeader(tableY);
      }

      drawTableRow(tableY, allGuests[i], i, i % 2 === 0);
      tableY += rowHeight;
    }

    // ===== PRIZE WINNERS SECTION =====
    const prizeWinners = allGuests.filter(g => g.prizeWins && g.prizeWins.length > 0);
    if (prizeWinners.length > 0) {
      doc.addPage();
      drawHeader();

      doc.fontSize(16).font('Helvetica-Bold').fillColor('#1e293b')
        .text('DAFTAR PEMENANG LUCKY DRAW', marginLeft, 100);

      let prizeY = 130;
      const prizeRowHeight = 25;

      // Prize table header
      doc.save();
      doc.rect(marginLeft, prizeY, pageWidth, 25).fill('#f59e0b');
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff');
      doc.text('No', marginLeft + 4, prizeY + 8, { width: 30, align: 'center' });
      doc.text('Guest ID', marginLeft + 34, prizeY + 8, { width: 80 });
      doc.text('Nama Pemenang', marginLeft + 114, prizeY + 8, { width: 150 });
      doc.text('Hadiah', marginLeft + 264, prizeY + 8, { width: 150 });
      doc.text('Kategori', marginLeft + 414, prizeY + 8, { width: 80 });
      doc.text('Waktu Menang', marginLeft + 494, prizeY + 8, { width: 100 });
      doc.text('Status', marginLeft + 594, prizeY + 8, { width: 100 });
      doc.restore();
      prizeY += 25;

      let prizeNum = 1;
      for (const guest of prizeWinners) {
        for (const pw of guest.prizeWins) {
          if (prizeY + prizeRowHeight > doc.page.height - 50) {
            doc.addPage();
            drawHeader();
            prizeY = 100;
          }

          const isEven = prizeNum % 2 === 0;
          doc.save();
          doc.rect(marginLeft, prizeY, pageWidth, prizeRowHeight).fill(isEven ? '#fffbeb' : '#ffffff');
          doc.moveTo(marginLeft, prizeY + prizeRowHeight).lineTo(marginLeft + pageWidth, prizeY + prizeRowHeight).stroke('#fde68a');
          doc.restore();

          doc.fontSize(8).font('Helvetica').fillColor('#374151');
          doc.text(String(prizeNum), marginLeft + 4, prizeY + 8, { width: 30, align: 'center' });
          doc.fillColor('#3b82f6').text(guest.guestId, marginLeft + 34, prizeY + 8, { width: 80 });
          doc.font('Helvetica-Bold').fillColor('#1e293b').text(truncateText(guest.name, 25), marginLeft + 114, prizeY + 8, { width: 150 });
          doc.font('Helvetica').fillColor('#f59e0b').text(truncateText(pw.prize?.name || '', 25), marginLeft + 264, prizeY + 8, { width: 150 });
          doc.fillColor('#64748b').text(pw.prize?.category === 'UTAMA' ? 'Utama' : 'Hiburan', marginLeft + 414, prizeY + 8, { width: 80 });
          doc.text(formatLocalTime(pw.wonAt), marginLeft + 494, prizeY + 8, { width: 100 });

          if (pw.collection) {
            doc.save();
            doc.roundedRect(marginLeft + 600, prizeY + 5, 60, 15, 3).fill('#22c55e');
            doc.fontSize(7).font('Helvetica-Bold').fillColor('#ffffff')
              .text('DIAMBIL', marginLeft + 600, prizeY + 8, { width: 60, align: 'center' });
            doc.restore();
          } else {
            doc.save();
            doc.roundedRect(marginLeft + 600, prizeY + 5, 60, 15, 3).fill('#f59e0b');
            doc.fontSize(7).font('Helvetica-Bold').fillColor('#ffffff')
              .text('BELUM', marginLeft + 600, prizeY + 8, { width: 60, align: 'center' });
            doc.restore();
          }

          prizeY += prizeRowHeight;
          prizeNum++;
        }
      }
    }

    // ===== PAGE NUMBERS =====
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).font('Helvetica').fillColor('#94a3b8')
        .text(`Halaman ${i + 1} dari ${pageCount}`, marginLeft, doc.page.height - 25,
          { width: pageWidth, align: 'center' });
    }

    doc.end();
  }

  @UseGuards(JwtAuthGuard)
  @Get('guests/:id')
  get(@Param('id') id: string) {
    return this.guests.getById(id);
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('photo', { storage: photosStorage() }))
  @Post('guests')
  async create(@Body() dto: CreateGuestDto, @UploadedFile() file?: Express.Multer.File) {
    const url = file ? `/api/uploads/photos/${file.filename}` : undefined;
    const res = await this.guests.create(dto, url);
    emitEvent({ type: 'guest-update', data: { action: 'create' } });
    return res;
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('photo', { storage: photosStorage() }))
  @Put('guests/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateGuestDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const url = file ? `/api/uploads/photos/${file.filename}` : undefined;
    const res = await this.guests.update(id, dto, url);
    emitEvent({ type: 'guest-update', data: { action: 'update' } });
    return res;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('guests/:id')
  async updatePartial(
    @Param('id') id: string,
    @Body() dto: UpdateGuestDto,
  ) {
    const res = await this.guests.update(id, dto);
    emitEvent({ type: 'guest-update', data: { action: 'update' } });
    return res;
  }

  @UseGuards(JwtAuthGuard)
  @Delete('guests/:id')
  async remove(@Param('id') id: string) {
    const res = await this.guests.remove(id);
    emitEvent({ type: 'guest-update', data: { action: 'delete' } });
    return res;
  }

  @UseGuards(JwtAuthGuard)
  @Post('guests/bulk-delete')
  async bulkDelete(@Body() dto: BulkDeleteGuestsDto) {
    const res = await this.guests.bulkDelete(dto);
    if (res.deleted > 0) {
      emitEvent({ type: 'guest-update', data: { action: 'bulk-delete', count: res.deleted } });
    }
    return res;
  }

  @UseGuards(JwtAuthGuard)
  @Post('guests/bulk-update')
  async bulkUpdate(@Body() dto: BulkUpdateGuestsDto) {
    const res = await this.guests.bulkUpdate(dto);
    if (res.updated > 0) {
      emitEvent({ type: 'guest-update', data: { action: 'bulk-update', count: res.updated } });
    }
    return res;
  }

  @UseGuards(JwtAuthGuard)
  @Post('guests/:id/checkin')
  async checkIn(@Param('id') id: string, @Request() req: any) {
    const adminId = req.user?.sub;
    const adminName = req.user?.displayName || req.user?.username || 'Admin';
    const updated = await this.guests.checkIn(id, adminId, adminName);
    emitEvent({ type: 'checkin', data: updated });
    return updated;
  }

  @UseGuards(JwtAuthGuard)
  @Post('guests/:id/uncheckin')
  async uncheckIn(
    @Param('id') id: string,
    @Body() body: { password: string; reason: string },
    @Request() req: any,
  ) {
    const adminId = req.user?.sub;
    const adminName = req.user?.displayName || req.user?.username || 'Admin';

    // Validate required fields
    if (!body?.password) {
      throw new BadRequestException('Password diperlukan untuk membatalkan check-in');
    }
    if (!body?.reason || body.reason.trim().length < 5) {
      throw new BadRequestException('Alasan pembatalan harus diisi (minimal 5 karakter)');
    }

    // Verify password
    const isValidPassword = await this.auth.verifyPasswordById(adminId, body.password);
    if (!isValidPassword) {
      throw new UnauthorizedException('Password salah');
    }

    // Proceed with uncheckin (includes audit logging)
    const updated = await this.guests.uncheckIn(id, adminId, adminName, body.reason.trim());
    emitEvent({ type: 'uncheckin', data: updated });
    return updated;
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      fileFilter: (
        _req: ExpressRequest,
        file: Express.Multer.File,
        cb: (error: Error | null, acceptFile: boolean) => void,
      ) => {
        const isXlsx = file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.originalname.endsWith('.xlsx') ||
          file.originalname.endsWith('.xls');
        if (!isXlsx) {
          return cb(new Error('Only Excel files (.xlsx, .xls) are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  @Post('guests/import')
  async importXlsx(@UploadedFile() file: Express.Multer.File, @Query('skipDuplicates') skipDuplicates?: string) {
    // Validate file
    if (!file || !file.buffer) {
      throw new Error('File tidak ditemukan. Silakan pilih file Excel (.xlsx) untuk diimport.');
    }

    // Check for active event first
    const activeEvent = await this.guests.getActiveEvent();
    if (!activeEvent) {
      throw new Error('Tidak ada event aktif. Silakan aktifkan event terlebih dahulu sebelum import data tamu.');
    }

    // Parse XLSX file
    let workbook;
    try {
      workbook = XLSX.read(file.buffer, { type: 'buffer' });
    } catch (parseError: any) {
      throw new Error(`Gagal membaca file Excel: ${parseError.message}. Pastikan file adalah format .xlsx atau .xls yang valid.`);
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('File Excel tidak memiliki sheet. Pastikan file memiliki data.');
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rows.length === 0) {
      throw new Error('File Excel kosong. Pastikan sheet pertama memiliki data dengan header: guest_id, name, table_location, email, company, department, division, category, notes');
    }

    const allowDuplicateGuestId = activeEvent.allowDuplicateGuestId ?? false;

    // Parse rows first
    const parsedRows: Array<{
      guestId: string;
      name: string;
      tableLocation: string;
      email?: string;
      company?: string;
      department?: string;
      division?: string;
      notes?: string;
      category?: string;
    }> = [];

    const invalidRows: Array<{ row: number; reason: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const guestId = row['guest_id'] ?? row['guestId'] ?? row['Guest ID'] ?? row['Guest Id'] ?? row['ID'] ?? row['id'];
      const name = row['name'] ?? row['Name'] ?? row['Nama'] ?? row['nama'];
      const tableLocation = row['table_location'] ?? row['table'] ?? row['Table'] ?? row['tableLocation'] ?? row['Meja'] ?? row['meja'] ?? row['Meja/Ruangan'];
      const email = row['email'] ?? row['Email'] ?? row['EMAIL'] ?? row['e-mail'] ?? row['E-mail'] ?? undefined;
      const company = row['company'] ?? row['organization'] ?? row['Company'] ?? row['Perusahaan'] ?? row['perusahaan'] ?? undefined;
      const department = row['department'] ?? row['Department'] ?? row['Departemen'] ?? row['departemen'] ?? undefined;
      const division = row['division'] ?? row['Division'] ?? row['divisi'] ?? row['Divisi'] ?? undefined;
      const notes = row['notes'] ?? row['Notes'] ?? row['Catatan'] ?? row['catatan'] ?? undefined;
      const category = row['category'] ?? row['Category'] ?? row['Kategori'] ?? row['kategori'] ?? undefined;

      if (!guestId || !name) {
        const missing = [];
        if (!guestId) missing.push('guest_id');
        if (!name) missing.push('name');
        invalidRows.push({ row: i + 2, reason: `Kolom wajib kosong: ${missing.join(', ')}` });
        continue;
      }
      parsedRows.push({ guestId: String(guestId), name: String(name), tableLocation: tableLocation ? String(tableLocation) : '-', email, company, department, division, notes, category });
    }

    if (parsedRows.length === 0) {
      const errorMsg = invalidRows.length > 0
        ? `Semua baris tidak valid. Contoh error baris ${invalidRows[0].row}: ${invalidRows[0].reason}`
        : 'Tidak ada data valid untuk diimport. Pastikan kolom guest_id dan name terisi.';
      throw new Error(errorMsg);
    }

    // Check for duplicates (only if duplicate IDs are not allowed)
    const guestIds = parsedRows.map(r => r.guestId);
    const names = parsedRows.map(r => r.name);
    const { duplicateIds, duplicateNames } = allowDuplicateGuestId
      ? { duplicateIds: [], duplicateNames: [] }
      : await this.guests.checkDuplicates(guestIds, names);

    const duplicateIdSet = new Set(duplicateIds.map(d => d.guestId));
    const duplicateNameSet = new Set(duplicateNames.map(d => d.name.toLowerCase()));

    let created = 0;
    let skipped = 0;
    const skippedDetails: Array<{ guestId: string; name: string; reason: string }> = [];
    const guestsToInsert: any[] = [];

    for (const row of parsedRows) {
      // Check if duplicate (skip check if allowDuplicateGuestId is enabled)
      const isDuplicateId = !allowDuplicateGuestId && duplicateIdSet.has(row.guestId);
      const isDuplicateName = !allowDuplicateGuestId && duplicateNameSet.has(row.name.toLowerCase());

      if (isDuplicateId || isDuplicateName) {
        skipped++;
        skippedDetails.push({
          guestId: row.guestId,
          name: row.name,
          reason: isDuplicateId ? 'ID sudah ada' : 'Nama sudah ada',
        });
        continue;
      }

      // Map category string to enum
      let categoryEnum: GuestCategory = GuestCategory.REGULAR;
      if (row.category) {
        const upperCat = row.category.toUpperCase();
        if (Object.values(GuestCategory).includes(upperCat as GuestCategory)) {
          categoryEnum = upperCat as GuestCategory;
        }
      }

      guestsToInsert.push({
        guestId: row.guestId,
        name: row.name,
        tableLocation: row.tableLocation,
        email: row.email,
        company: row.company,
        department: row.department,
        division: row.division,
        notes: row.notes,
        category: categoryEnum,
      });
    }

    if (guestsToInsert.length > 0) {
      try {
        created = await this.guests.bulkCreate(guestsToInsert, activeEvent.id);
      } catch (err: any) {
        throw new Error(`Gagal menyimpan data tamu bulk: ${err.message}`);
      }
    }

    if (created > 0) {
      emitEvent({ type: 'guest-update', data: { action: 'import', count: created } });
    }

    return {
      created,
      skipped,
      total: parsedRows.length,
      duplicates: skippedDetails,
      allowDuplicateGuestId,
    };
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      fileFilter: (
        _req: ExpressRequest,
        file: Express.Multer.File,
        cb: (error: Error | null, acceptFile: boolean) => void,
      ) => {
        const isXlsx = file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.originalname.endsWith('.xlsx') ||
          file.originalname.endsWith('.xls');
        if (!isXlsx) {
          return cb(new Error('Only Excel files (.xlsx, .xls) are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  @Post('guests/import/check-duplicates')
  async checkImportDuplicates(@UploadedFile() file: Express.Multer.File) {
    // Parse XLSX file
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    const guestIds: string[] = [];
    const names: string[] = [];

    for (const row of rows) {
      const guestId = row['guest_id'] ?? row['guestId'] ?? row['Guest ID'] ?? row['Guest Id'];
      const name = row['name'] ?? row['Name'] ?? row['Nama'] ?? row['nama'];
      if (guestId) guestIds.push(guestId);
      if (name) names.push(name);
    }

    const { duplicateIds, duplicateNames } = await this.guests.checkDuplicates(guestIds, names);

    return {
      totalRows: rows.length,
      duplicateIds,
      duplicateNames,
      hasDuplicates: duplicateIds.length > 0 || duplicateNames.length > 0,
    };
  }

}

function escapeCsv(value: string | null): string {
  const v = value ?? '';
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return '"' + v.replace(/"/g, '""') + '"';
  }
  return v;
}

function formatLocalTime(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' });
}

function truncateText(text: string | null | undefined, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}
