"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { apiFetch } from "@/lib/api";
import { 
  Mail, 
  Server, 
  Lock, 
  User, 
  Send, 
  Save, 
  CheckCircle, 
  XCircle, 
  Loader2,
  ArrowLeft,
  RefreshCw,
  Info,
  Eye,
  EyeOff
} from "lucide-react";

interface EmailSettings {
  id?: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  senderName: string;
  senderEmail: string;
  emailSubject: string;
  emailTemplate?: string;
}

const defaultTemplate = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Undangan {{event_name}}</title>
</head>
<body style="margin:0;padding:0;background-color:#1a1a2e;font-family:'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#1a1a2e;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:40px 30px;text-align:center;border-radius:16px 16px 0 0;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">{{event_name}}</h1>
              <p style="margin:10px 0 0 0;color:rgba(255,255,255,0.9);font-size:14px;">Undangan Resmi</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="background-color:#ffffff;padding:40px 30px;">
              <p style="margin:0 0 20px 0;color:#333333;font-size:16px;">
                Yth. <strong style="color:#667eea;">{{guest_name}}</strong>,
              </p>
              
              <p style="margin:0 0 30px 0;color:#555555;font-size:15px;line-height:1.7;">
                Dengan hormat, kami mengundang Bapak/Ibu untuk menghadiri acara:
              </p>
              
              <!-- Event Details -->
              <table role="presentation" width="100%" style="background:#f8f9ff;border-radius:12px;border:1px solid #e8eaff;margin-bottom:30px;">
                <tr>
                  <td style="padding:25px;">
                    <h2 style="margin:0 0 20px 0;color:#667eea;font-size:16px;">Detail Acara</h2>
                    <table role="presentation" width="100%">
                      <tr><td style="padding:8px 0;color:#666;">Tanggal</td><td style="padding:8px 0;color:#333;font-weight:600;">{{event_date}}</td></tr>
                      <tr><td style="padding:8px 0;color:#666;border-top:1px solid #e8eaff;">Waktu</td><td style="padding:8px 0;color:#333;font-weight:600;border-top:1px solid #e8eaff;">{{event_time}} WIB</td></tr>
                      <tr><td style="padding:8px 0;color:#666;border-top:1px solid #e8eaff;">Lokasi</td><td style="padding:8px 0;color:#333;font-weight:600;border-top:1px solid #e8eaff;">{{event_location}}</td></tr>
                      <tr><td style="padding:8px 0;color:#666;border-top:1px solid #e8eaff;">Meja/Area</td><td style="padding:8px 0;color:#333;font-weight:600;border-top:1px solid #e8eaff;">{{table_location}}</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Guest Card -->
              <table role="presentation" width="100%" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:12px;margin-bottom:30px;">
                <tr>
                  <td style="padding:25px;text-align:center;">
                    <p style="margin:0;color:rgba(255,255,255,0.8);font-size:12px;text-transform:uppercase;">Kartu Tamu</p>
                    <h3 style="margin:10px 0 5px 0;color:#ffffff;font-size:24px;">{{guest_name}}</h3>
                    <p style="margin:0;color:rgba(255,255,255,0.9);font-size:14px;">ID: {{guest_id}}</p>
                  </td>
                </tr>
              </table>
              
              <!-- QR Code -->
              <table role="presentation" width="100%" style="background-color:#f8f9fa;border-radius:12px;border:2px dashed #667eea;margin-bottom:30px;">
                <tr>
                  <td style="padding:30px;text-align:center;">
                    <p style="margin:0 0 15px 0;color:#667eea;font-size:14px;font-weight:600;">QR Code Check-in</p>
                    {{qr_code}}
                    <p style="margin:15px 0 0 0;color:#666666;font-size:13px;">Tunjukkan QR Code ini saat registrasi</p>
                  </td>
                </tr>
              </table>
              
              {{custom_message}}
              
              <p style="margin:0 0 10px 0;color:#555555;font-size:15px;">Kehadiran Bapak/Ibu sangat kami harapkan.</p>
              <p style="margin:20px 0 0 0;color:#333333;font-size:15px;">Hormat kami,<br><strong>Panitia {{event_name}}</strong></p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color:#f1f1f1;padding:25px 30px;text-align:center;border-radius:0 0 16px 16px;">
              <p style="margin:0;color:#888888;font-size:12px;">Email ini dikirim secara otomatis. Mohon tidak membalas email ini.</p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

export default function EmailSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [settings, setSettings] = useState<EmailSettings>({
    smtpHost: "",
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: "",
    smtpPass: "",
    senderName: "",
    senderEmail: "",
    emailSubject: "Undangan Event",
    emailTemplate: "",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await apiFetch<EmailSettings>("/email/settings");
      if (data && data.id) {
        setSettings(prev => ({
          ...prev,
          ...data,
          smtpPass: "", // Don't show password, user needs to re-enter if changing
        }));
      }
    } catch (error: any) {
      console.error("Failed to fetch settings:", error?.message || error);
      // Don't show error for initial load - just use defaults
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validate required fields
    if (!settings.smtpHost || !settings.smtpUser || !settings.senderEmail) {
      alert("Mohon lengkapi semua field yang wajib diisi (SMTP Host, Username, Email Pengirim)");
      return;
    }
    
    setSaving(true);
    try {
      await apiFetch("/email/settings", {
        method: "POST",
        body: JSON.stringify(settings),
      });
      alert("Pengaturan email berhasil disimpan!");
    } catch (error: any) {
      alert(error.message || "Gagal menyimpan pengaturan");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!settings.smtpHost || !settings.smtpUser) {
      setTestResult({ success: false, message: "Lengkapi SMTP Host dan Username terlebih dahulu" });
      return;
    }
    
    setTesting(true);
    setTestResult(null);
    try {
      // First save the settings if password is provided
      if (settings.smtpPass) {
        await apiFetch("/email/settings", {
          method: "POST",
          body: JSON.stringify(settings),
        });
      }
      
      const result = await apiFetch<{ success: boolean; message: string }>("/email/test-connection", { method: "POST" });
      
      // Translate common error messages
      if (!result.success) {
        const errorMap: Record<string, string> = {
          'Authentication rejected': 'Autentikasi ditolak. Periksa username dan password.',
          'Connection timeout': 'Koneksi timeout. Periksa host dan port SMTP.',
          'Connection refused': 'Koneksi ditolak. Periksa host dan port SMTP.',
          'Invalid login': 'Login tidak valid. Periksa username dan password.',
          'ENOTFOUND': 'Server SMTP tidak ditemukan. Periksa hostname.',
          'ECONNREFUSED': 'Koneksi ditolak. Periksa port SMTP.',
        };
        
        let friendlyMessage = result.message;
        for (const [key, msg] of Object.entries(errorMap)) {
          if (result.message.includes(key)) {
            friendlyMessage = msg;
            break;
          }
        }
        setTestResult({ success: false, message: friendlyMessage });
      } else {
        setTestResult({ success: true, message: "Koneksi berhasil! SMTP siap digunakan." });
      }
    } catch (error: any) {
      setTestResult({ success: false, message: error.message || "Gagal test koneksi" });
    } finally {
      setTesting(false);
    }
  };

  const handleChange = (field: keyof EmailSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">Email Settings</h1>
            <p className="text-white/60 text-sm">Konfigurasi SMTP untuk mengirim email undangan</p>
          </div>
        </div>

        {/* SMTP Configuration */}
        <Card variant="glass" className="surface-elevated">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
            <Server size={20} />
            Konfigurasi SMTP
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SMTP Host</Label>
                <Input
                  placeholder="smtp.gmail.com"
                  value={settings.smtpHost}
                  onChange={(e) => handleChange("smtpHost", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>SMTP Port</Label>
                <Input
                  type="number"
                  placeholder="587"
                  value={settings.smtpPort}
                  onChange={(e) => handleChange("smtpPort", parseInt(e.target.value) || 587)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="smtpSecure"
                checked={settings.smtpSecure}
                onChange={(e) => handleChange("smtpSecure", e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-white/10"
              />
              <Label htmlFor="smtpSecure" className="cursor-pointer">
                Use SSL/TLS (port 465)
              </Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Username / Email</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                  <Input
                    className="pl-10"
                    placeholder="your-email@gmail.com"
                    value={settings.smtpUser}
                    onChange={(e) => handleChange("smtpUser", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Password / App Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                  <Input
                    className="pl-10 pr-10"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={settings.smtpPass}
                    onChange={(e) => handleChange("smtpPass", e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Info box */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-brand-primary/10 border border-brand-primary/20">
              <Info size={20} className="text-brand-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm text-white/70">
                <p className="font-medium text-white mb-1">Tips untuk Gmail:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Aktifkan 2-Factor Authentication di akun Google</li>
                  <li>Buat App Password di: Google Account → Security → App Passwords</li>
                  <li>Gunakan App Password (bukan password akun) di field password</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>

        {/* Sender Configuration */}
        <Card variant="glass" className="surface-elevated">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
            <Mail size={20} />
            Pengaturan Pengirim
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nama Pengirim</Label>
                <Input
                  placeholder="Event Organizer"
                  value={settings.senderName}
                  onChange={(e) => handleChange("senderName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Email Pengirim</Label>
                <Input
                  type="email"
                  placeholder="noreply@company.com"
                  value={settings.senderEmail}
                  onChange={(e) => handleChange("senderEmail", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subject Email</Label>
              <Input
                placeholder="Undangan Event"
                value={settings.emailSubject}
                onChange={(e) => handleChange("emailSubject", e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Email Template */}
        <Card variant="glass" className="surface-elevated">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
            <Send size={20} />
            Template Email (Opsional)
          </h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-brand-warning/10 border border-brand-warning/20">
              <Info size={20} className="text-brand-warning flex-shrink-0 mt-0.5" />
              <div className="text-sm text-white/70">
                <p className="font-medium text-white mb-1">Placeholder yang tersedia:</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                  <code className="text-brand-warning">{"{{guest_name}}"}</code>
                  <span>Nama tamu</span>
                  <code className="text-brand-warning">{"{{guest_id}}"}</code>
                  <span>ID tamu</span>
                  <code className="text-brand-warning">{"{{event_name}}"}</code>
                  <span>Nama event</span>
                  <code className="text-brand-warning">{"{{event_date}}"}</code>
                  <span>Tanggal event</span>
                  <code className="text-brand-warning">{"{{event_time}}"}</code>
                  <span>Jam event</span>
                  <code className="text-brand-warning">{"{{event_location}}"}</code>
                  <span>Lokasi</span>
                  <code className="text-brand-warning">{"{{table_location}}"}</code>
                  <span>Meja/Area</span>
                  <code className="text-brand-warning">{"{{qr_code}}"}</code>
                  <span>QR Code image</span>
                  <code className="text-brand-warning">{"{{custom_message}}"}</code>
                  <span>Pesan kustom</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>HTML Template</Label>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleChange("emailTemplate", defaultTemplate)}
                >
                  <RefreshCw size={14} className="mr-1" />
                  Load Default
                </Button>
              </div>
              <Textarea
                rows={12}
                placeholder="Kosongkan untuk menggunakan template default..."
                value={settings.emailTemplate || ""}
                onChange={(e) => handleChange("emailTemplate", e.target.value)}
                className="font-mono text-sm bg-brand-bgSubtle"
              />
            </div>
          </div>
        </Card>

        {/* Test & Save */}
        <Card variant="glass" className="surface-elevated">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="secondary" 
                onClick={handleTestConnection}
                disabled={testing || !settings.smtpHost}
              >
                {testing ? (
                  <Loader2 className="animate-spin mr-2" size={16} />
                ) : (
                  <RefreshCw className="mr-2" size={16} />
                )}
                Test Connection
              </Button>
              {testResult && (
                <div className={`flex items-center gap-2 text-sm ${testResult.success ? 'text-brand-success' : 'text-brand-danger'}`}>
                  {testResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  {testResult.message}
                </div>
              )}
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="animate-spin mr-2" size={16} />
              ) : (
                <Save className="mr-2" size={16} />
              )}
              Simpan Pengaturan
            </Button>
          </div>
        </Card>

        {/* Navigation to send emails */}
        <Card variant="glass" className="surface-elevated">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div>
              <h3 className="font-medium text-white">Kirim Email ke Tamu</h3>
              <p className="text-sm text-white/60">Pergi ke halaman tamu untuk mengirim email undangan</p>
            </div>
            <Button variant="secondary" onClick={() => router.push('/admin/guests')}>
              <Mail className="mr-2" size={16} />
              Buka Manajemen Tamu
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
