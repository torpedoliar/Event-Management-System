import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument from 'pdfkit';
import { Response } from 'express';

interface ReportOptions {
  eventId?: string;
  includeCheckedInOnly?: boolean;
  includePhoto?: boolean;
  groupByCompany?: boolean;
  groupByCategory?: boolean;
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private async getActiveEventId(): Promise<string | null> {
    const active = await this.prisma.event.findFirst({ where: { isActive: true } });
    return active ? active.id : null;
  }

  async generateGuestReport(res: Response, options: ReportOptions = {}) {
    let eventId: string | undefined = options.eventId;
    if (!eventId) {
      eventId = (await this.getActiveEventId()) ?? undefined;
    }
    if (!eventId) {
      throw new Error('No active event found');
    }

    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new Error('Event not found');

    const whereClause: any = { eventId };
    if (options.includeCheckedInOnly) {
      whereClause.checkedIn = true;
    }

    const guests = await this.prisma.guest.findMany({
      where: whereClause,
      orderBy: [{ queueNumber: 'asc' }],
      include: {
        prizeWins: { include: { prize: true } },
        souvenirTakes: { include: { souvenir: true } },
      },
    });

    const stats = {
      total: guests.length,
      checkedIn: guests.filter(g => g.checkedIn).length,
      categories: {} as Record<string, number>,
      companies: {} as Record<string, number>,
    };

    for (const g of guests) {
      stats.categories[g.category] = (stats.categories[g.category] || 0) + 1;
      const company = g.company || 'Tidak Ada';
      stats.companies[company] = (stats.companies[company] || 0) + 1;
    }

    // Create PDF
    const doc = new PDFDocument({ 
      size: 'A4', 
      margin: 50,
      info: {
        Title: `Guest Report - ${event.name}`,
        Author: 'Event Management System',
        CreationDate: new Date(),
      }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="guest-report-${Date.now()}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('GUEST REPORT', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(16).font('Helvetica').text(event.name, { align: 'center' });
    doc.fontSize(10).fillColor('#666666').text(
      `Generated: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`,
      { align: 'center' }
    );
    doc.moveDown(1);

    // Summary Box
    doc.fillColor('#000000');
    this.drawSummaryBox(doc, stats, event);
    doc.moveDown(1);

    // Category Breakdown
    if (Object.keys(stats.categories).length > 1) {
      doc.fontSize(14).font('Helvetica-Bold').text('By Category');
      doc.moveDown(0.3);
      for (const [cat, count] of Object.entries(stats.categories)) {
        doc.fontSize(10).font('Helvetica').text(`  • ${cat}: ${count} guests`);
      }
      doc.moveDown(0.5);
    }

    // Company Breakdown (top 10)
    if (Object.keys(stats.companies).length > 1) {
      doc.fontSize(14).font('Helvetica-Bold').text('By Company (Top 10)');
      doc.moveDown(0.3);
      const sortedCompanies = Object.entries(stats.companies)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      for (const [company, count] of sortedCompanies) {
        doc.fontSize(10).font('Helvetica').text(`  • ${company}: ${count} guests`);
      }
      doc.moveDown(1);
    }

    // Guest Table
    doc.addPage();
    doc.fontSize(14).font('Helvetica-Bold').text('Guest List', { align: 'center' });
    doc.moveDown(0.5);

    // Table Header
    const tableTop = doc.y;
    const colWidths = [40, 80, 150, 100, 80, 50];
    const headers = ['No', 'Guest ID', 'Name', 'Company', 'Table', 'Status'];
    
    doc.fontSize(9).font('Helvetica-Bold');
    let xPos = 50;
    headers.forEach((header, i) => {
      doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'left' });
      xPos += colWidths[i];
    });

    doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke();

    // Table Rows
    let y = tableTop + 20;
    doc.font('Helvetica').fontSize(8);

    for (let i = 0; i < guests.length; i++) {
      const guest = guests[i];
      
      // Check page break
      if (y > 750) {
        doc.addPage();
        y = 50;
        // Re-draw header
        doc.fontSize(9).font('Helvetica-Bold');
        xPos = 50;
        headers.forEach((header, j) => {
          doc.text(header, xPos, y, { width: colWidths[j], align: 'left' });
          xPos += colWidths[j];
        });
        doc.moveTo(50, y + 15).lineTo(545, y + 15).stroke();
        y += 20;
        doc.font('Helvetica').fontSize(8);
      }

      xPos = 50;
      const rowData = [
        String(guest.queueNumber),
        guest.guestId.substring(0, 12),
        guest.name.substring(0, 25),
        (guest.company || '-').substring(0, 15),
        (guest.tableLocation || '-').substring(0, 12),
        guest.checkedIn ? '✓' : '-',
      ];

      rowData.forEach((data, j) => {
        doc.text(data, xPos, y, { width: colWidths[j], align: 'left' });
        xPos += colWidths[j];
      });

      y += 15;
      
      // Alternate row background
      if (i % 2 === 0) {
        doc.rect(50, y - 15, 495, 15).fill('#f8f9fa').stroke();
        // Re-draw text on colored background
        xPos = 50;
        doc.fillColor('#000000');
        rowData.forEach((data, j) => {
          doc.text(data, xPos, y - 15, { width: colWidths[j], align: 'left' });
          xPos += colWidths[j];
        });
      }
    }

    // Footer
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor('#888888');
      doc.text(
        `Page ${i + 1} of ${pageCount}`,
        50,
        doc.page.height - 30,
        { align: 'center', width: doc.page.width - 100 }
      );
    }

    doc.end();
  }

  private drawSummaryBox(doc: PDFKit.PDFDocument, stats: any, event: any) {
    const boxY = doc.y;
    const boxHeight = 80;
    
    // Draw box background
    doc.rect(50, boxY, 495, boxHeight).fill('#f0f4f8').stroke();
    doc.fillColor('#000000');

    // Stats
    const col1X = 80;
    const col2X = 220;
    const col3X = 360;
    const textY = boxY + 20;

    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('Total Guests', col1X, textY);
    doc.text('Checked In', col2X, textY);
    doc.text('Attendance Rate', col3X, textY);

    doc.fontSize(24).font('Helvetica-Bold').fillColor('#1a56db');
    doc.text(String(stats.total), col1X, textY + 20);
    doc.fillColor('#059669').text(String(stats.checkedIn), col2X, textY + 20);
    const rate = stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0;
    doc.fillColor('#7c3aed').text(`${rate}%`, col3X, textY + 20);

    doc.fillColor('#000000');
    doc.y = boxY + boxHeight + 10;
  }

  async generateCheckinReport(res: Response, eventId?: string) {
    return this.generateGuestReport(res, { 
      eventId, 
      includeCheckedInOnly: true 
    });
  }

  async generateAttendanceSummary(eventId?: string) {
    let eId: string | undefined = eventId;
    if (!eId) {
      eId = (await this.getActiveEventId()) ?? undefined;
    }
    if (!eId) return null;

    const [event, guests, checkedInGuests] = await Promise.all([
      this.prisma.event.findUnique({ where: { id: eId } }),
      this.prisma.guest.findMany({ where: { eventId: eId } }),
      this.prisma.guest.findMany({ where: { eventId: eId, checkedIn: true } }),
    ]);

    // Hourly breakdown
    const hourlyCheckins: Record<string, number> = {};
    for (const g of checkedInGuests) {
      if (g.checkedInAt) {
        const hour = g.checkedInAt.toISOString().substring(0, 13);
        hourlyCheckins[hour] = (hourlyCheckins[hour] || 0) + 1;
      }
    }

    // Category breakdown
    const byCategory: Record<string, { total: number; checkedIn: number }> = {};
    for (const g of guests) {
      if (!byCategory[g.category]) {
        byCategory[g.category] = { total: 0, checkedIn: 0 };
      }
      byCategory[g.category].total++;
      if (g.checkedIn) byCategory[g.category].checkedIn++;
    }

    // Company breakdown
    const byCompany: Record<string, { total: number; checkedIn: number }> = {};
    for (const g of guests) {
      const company = g.company || 'Umum';
      if (!byCompany[company]) {
        byCompany[company] = { total: 0, checkedIn: 0 };
      }
      byCompany[company].total++;
      if (g.checkedIn) byCompany[company].checkedIn++;
    }

    return {
      event,
      summary: {
        totalGuests: guests.length,
        checkedIn: checkedInGuests.length,
        notCheckedIn: guests.length - checkedInGuests.length,
        attendanceRate: guests.length > 0 
          ? Math.round((checkedInGuests.length / guests.length) * 100) 
          : 0,
      },
      hourlyCheckins: Object.entries(hourlyCheckins)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([hour, count]) => ({ hour, count })),
      byCategory: Object.entries(byCategory).map(([category, data]) => ({
        category,
        ...data,
        rate: data.total > 0 ? Math.round((data.checkedIn / data.total) * 100) : 0,
      })),
      byCompany: Object.entries(byCompany)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 20)
        .map(([company, data]) => ({
          company,
          ...data,
          rate: data.total > 0 ? Math.round((data.checkedIn / data.total) * 100) : 0,
        })),
    };
  }
}
