import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import * as nodemailer from 'nodemailer';
import * as QRCode from 'qrcode';

interface SendEmailDto {
  guestId: string;
  customMessage?: string;
}

interface BulkSendEmailDto {
  guestIds: string[];
  customMessage?: string;
}

interface EmailSettingsDto {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  senderName: string;
  senderEmail: string;
  emailSubject?: string;
  emailTemplate?: string;
}

@Injectable()
export class EmailService {
  constructor(
    private prisma: PrismaService,
    private events: EventsService,
  ) {}

  // Get email settings
  async getSettings() {
    const settings = await this.prisma.emailSettings.findFirst({
      where: { isActive: true },
    });
    if (settings) {
      // Mask password for security
      return { ...settings, smtpPass: '********' };
    }
    // Return empty object instead of null to prevent JSON parse error
    return {
      id: null,
      smtpHost: '',
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: '',
      smtpPass: '',
      senderName: '',
      senderEmail: '',
      emailSubject: 'Undangan Event',
      emailTemplate: null,
      isActive: false,
    };
  }

  // Get raw settings (with password) for internal use
  private async getRawSettings() {
    return this.prisma.emailSettings.findFirst({
      where: { isActive: true },
    });
  }

  // Save email settings
  async saveSettings(dto: EmailSettingsDto) {
    // Get existing settings
    const existing = await this.prisma.emailSettings.findFirst({
      where: { isActive: true },
    });

    // If password is empty/masked and settings exist, keep the old password
    let passwordToSave = dto.smtpPass;
    if (existing && (!dto.smtpPass || dto.smtpPass === '********' || dto.smtpPass === '')) {
      passwordToSave = existing.smtpPass;
    }

    // Prepare data without password, then add it
    const { smtpPass, ...restDto } = dto;
    const dataToSave = { ...restDto, smtpPass: passwordToSave, isActive: true };

    if (existing) {
      return this.prisma.emailSettings.update({
        where: { id: existing.id },
        data: dataToSave,
      });
    }

    // For new settings, password is required
    if (!passwordToSave) {
      throw new BadRequestException('SMTP password is required for new configuration');
    }

    return this.prisma.emailSettings.create({
      data: dataToSave,
    });
  }

  // Test email connection
  async testConnection() {
    const settings = await this.getRawSettings();
    if (!settings) {
      throw new BadRequestException('Email settings not configured');
    }

    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpSecure,
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPass,
      },
    });

    try {
      await transporter.verify();
      return { success: true, message: 'Connection successful' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  // Generate QR code as base64
  async generateQRCode(data: string): Promise<string> {
    return QRCode.toDataURL(data, {
      width: 200,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });
  }

  // Generate QR code as Buffer for email attachment
  async generateQRCodeBuffer(data: string): Promise<Buffer> {
    return QRCode.toBuffer(data, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });
  }

  // Format date for email
  private formatDate(date: Date | null): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Jakarta'
    });
  }

  // Format time for email (uses event.time string field)
  private formatEventTime(time: string | null | undefined): string {
    if (!time) return '-';
    return `${time} WIB`;
  }

  // Build email HTML content (uses cid:qrcode for embedded image)
  private async buildEmailContent(
    guest: any,
    event: any,
    customMessage: string,
  ): Promise<string> {
    const settings = await this.getRawSettings();
    
    // QR Code image tag with CID reference for email attachment
    const qrCodeImg = `<img src="cid:qrcode" alt="QR Code Check-in" style="width:200px;height:200px;display:block;margin:0 auto;" />`;
    
    // Use custom template if available, otherwise use default
    if (settings?.emailTemplate) {
      return settings.emailTemplate
        .replace(/\{\{guest_name\}\}/g, guest.name)
        .replace(/\{\{guest_id\}\}/g, guest.guestId)
        .replace(/\{\{event_name\}\}/g, event.name)
        .replace(/\{\{event_date\}\}/g, this.formatDate(event.date))
        .replace(/\{\{event_time\}\}/g, this.formatEventTime(event.time))
        .replace(/\{\{event_location\}\}/g, event.location || '-')
        .replace(/\{\{table_location\}\}/g, guest.tableLocation || '-')
        .replace(/\{\{custom_message\}\}/g, customMessage || '')
        .replace(/\{\{qr_code\}\}/g, qrCodeImg);
    }

    // Default email template - Modern & Professional Design
    return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Undangan ${event.name}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#1a1a2e;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <!-- Wrapper -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#1a1a2e;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <!-- Container -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;">
          
          <!-- Header with Gradient -->
          <tr>
            <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:40px 30px;text-align:center;border-radius:16px 16px 0 0;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">${event.name}</h1>
              <p style="margin:10px 0 0 0;color:rgba(255,255,255,0.9);font-size:14px;">Undangan Resmi</p>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="background-color:#ffffff;padding:40px 30px;">
              
              <!-- Greeting -->
              <p style="margin:0 0 20px 0;color:#333333;font-size:16px;line-height:1.6;">
                Yth. <strong style="color:#667eea;">${guest.name}</strong>,
              </p>
              
              <p style="margin:0 0 30px 0;color:#555555;font-size:15px;line-height:1.7;">
                Dengan hormat, kami mengundang Bapak/Ibu untuk menghadiri acara yang akan kami selenggarakan:
              </p>
              
              <!-- Event Details Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:linear-gradient(135deg,#f8f9ff 0%,#f0f2ff 100%);border-radius:12px;border:1px solid #e8eaff;margin-bottom:30px;">
                <tr>
                  <td style="padding:25px;">
                    <h2 style="margin:0 0 20px 0;color:#667eea;font-size:16px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
                      📅 Detail Acara
                    </h2>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding:8px 0;color:#666666;font-size:14px;width:100px;">Acara</td>
                        <td style="padding:8px 0;color:#333333;font-size:14px;font-weight:600;">${event.name}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#666666;font-size:14px;border-top:1px solid #e8eaff;">Tanggal</td>
                        <td style="padding:8px 0;color:#333333;font-size:14px;font-weight:600;border-top:1px solid #e8eaff;">${this.formatDate(event.date)}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#666666;font-size:14px;border-top:1px solid #e8eaff;">Waktu</td>
                        <td style="padding:8px 0;color:#333333;font-size:14px;font-weight:600;border-top:1px solid #e8eaff;">${this.formatEventTime(event.time)}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#666666;font-size:14px;border-top:1px solid #e8eaff;">Lokasi</td>
                        <td style="padding:8px 0;color:#333333;font-size:14px;font-weight:600;border-top:1px solid #e8eaff;">${event.location || '-'}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#666666;font-size:14px;border-top:1px solid #e8eaff;">Meja/Area</td>
                        <td style="padding:8px 0;color:#333333;font-size:14px;font-weight:600;border-top:1px solid #e8eaff;">${guest.tableLocation || '-'}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Guest Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:12px;margin-bottom:30px;">
                <tr>
                  <td style="padding:25px;text-align:center;">
                    <p style="margin:0;color:rgba(255,255,255,0.8);font-size:12px;text-transform:uppercase;letter-spacing:2px;">Kartu Tamu</p>
                    <h3 style="margin:10px 0 5px 0;color:#ffffff;font-size:24px;font-weight:700;">${guest.name}</h3>
                    <p style="margin:0;color:rgba(255,255,255,0.9);font-size:14px;">ID: <strong>${guest.guestId}</strong></p>
                  </td>
                </tr>
              </table>
              
              <!-- QR Code Section -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f8f9fa;border-radius:12px;border:2px dashed #667eea;margin-bottom:30px;">
                <tr>
                  <td style="padding:30px;text-align:center;">
                    <p style="margin:0 0 15px 0;color:#667eea;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
                      🎫 QR Code Check-in
                    </p>
                    ${qrCodeImg}
                    <p style="margin:15px 0 0 0;color:#666666;font-size:13px;line-height:1.5;">
                      Tunjukkan QR Code ini kepada petugas<br>saat registrasi di lokasi acara
                    </p>
                  </td>
                </tr>
              </table>
              
              ${customMessage ? `
              <!-- Custom Message -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#e8f4fd;border-radius:12px;border-left:4px solid #667eea;margin-bottom:30px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0;color:#333333;font-size:14px;line-height:1.6;">${customMessage}</p>
                  </td>
                </tr>
              </table>
              ` : ''}
              
              <!-- Closing -->
              <p style="margin:0 0 10px 0;color:#555555;font-size:15px;line-height:1.7;">
                Kehadiran Bapak/Ibu sangat kami harapkan. Terima kasih atas perhatiannya.
              </p>
              
              <p style="margin:20px 0 0 0;color:#333333;font-size:15px;">
                Hormat kami,<br>
                <strong>Panitia ${event.name}</strong>
              </p>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color:#f1f1f1;padding:25px 30px;text-align:center;border-radius:0 0 16px 16px;">
              <p style="margin:0;color:#888888;font-size:12px;line-height:1.5;">
                Email ini dikirim secara otomatis. Mohon tidak membalas email ini.<br>
                Jika ada pertanyaan, hubungi panitia acara.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  // Send email to single guest
  async sendEmail(dto: SendEmailDto, adminId?: string, adminName?: string) {
    const settings = await this.getRawSettings();
    if (!settings) {
      throw new BadRequestException('Email settings not configured');
    }

    const guest = await this.prisma.guest.findUnique({
      where: { id: dto.guestId },
      include: { event: true },
    });

    if (!guest) {
      throw new NotFoundException('Guest not found');
    }

    if (!guest.email) {
      throw new BadRequestException('Guest does not have an email address');
    }

    // Generate QR code as Buffer for email attachment
    const qrCodeData = guest.guestId;
    const qrCodeBuffer = await this.generateQRCodeBuffer(qrCodeData);

    // Build email content (uses cid:qrcode reference)
    const htmlContent = await this.buildEmailContent(
      guest,
      guest.event,
      dto.customMessage || '',
    );

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpSecure,
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPass,
      },
    });

    try {
      // Send email with embedded QR code attachment
      await transporter.sendMail({
        from: `"${settings.senderName}" <${settings.senderEmail}>`,
        to: guest.email,
        subject: settings.emailSubject || 'Undangan Event',
        html: htmlContent,
        attachments: [
          {
            filename: 'qrcode.png',
            content: qrCodeBuffer,
            cid: 'qrcode',
          },
        ],
      });

      // Log success
      await this.prisma.emailLog.create({
        data: {
          guestId: guest.id,
          eventId: guest.eventId,
          recipient: guest.email,
          subject: settings.emailSubject || 'Undangan Event',
          status: 'sent',
          sentById: adminId,
          sentByName: adminName,
        },
      });

      // Update guest email status
      await this.prisma.guest.update({
        where: { id: guest.id },
        data: { emailSent: true, emailSentAt: new Date() },
      });

      return { success: true, message: 'Email sent successfully' };
    } catch (error: any) {
      // Log failure
      await this.prisma.emailLog.create({
        data: {
          guestId: guest.id,
          eventId: guest.eventId,
          recipient: guest.email,
          subject: settings.emailSubject || 'Undangan Event',
          status: 'failed',
          errorMessage: error.message,
          sentById: adminId,
          sentByName: adminName,
        },
      });

      throw new BadRequestException(`Failed to send email: ${error.message}`);
    }
  }

  // Send bulk emails
  async sendBulkEmails(dto: BulkSendEmailDto, adminId?: string, adminName?: string) {
    const results = {
      total: dto.guestIds.length,
      sent: 0,
      failed: 0,
      skipped: 0,
      details: [] as any[],
    };

    for (const guestId of dto.guestIds) {
      try {
        const guest = await this.prisma.guest.findUnique({ where: { id: guestId } });
        if (!guest?.email) {
          results.skipped++;
          results.details.push({ guestId, status: 'skipped', reason: 'No email address' });
          continue;
        }

        await this.sendEmail({ guestId, customMessage: dto.customMessage }, adminId, adminName);
        results.sent++;
        results.details.push({ guestId, status: 'sent' });
      } catch (error: any) {
        results.failed++;
        results.details.push({ guestId, status: 'failed', reason: error.message });
      }
    }

    return results;
  }

  // Get email logs
  async getEmailLogs(options: { eventId?: string; guestId?: string; page?: number; pageSize?: number }) {
    const { eventId, guestId, page = 1, pageSize = 50 } = options;
    const where: any = {};
    
    if (eventId) where.eventId = eventId;
    if (guestId) where.guestId = guestId;

    const [total, data] = await this.prisma.$transaction([
      this.prisma.emailLog.count({ where }),
      this.prisma.emailLog.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { guest: { select: { name: true, guestId: true, email: true } } },
      }),
    ]);

    return { total, data, page, pageSize };
  }

  // Get email statistics
  async getEmailStats(eventId?: string) {
    let eId = eventId;
    if (!eId) {
      const active = await this.events.getActive();
      if (!active) return { total: 0, withEmail: 0, sent: 0, pending: 0 };
      eId = active.id;
    }

    const [total, withEmail, sent] = await Promise.all([
      this.prisma.guest.count({ where: { eventId: eId } }),
      this.prisma.guest.count({ where: { eventId: eId, email: { not: null } } }),
      this.prisma.guest.count({ where: { eventId: eId, emailSent: true } }),
    ]);

    return {
      total,
      withEmail,
      sent,
      pending: withEmail - sent,
    };
  }
}
