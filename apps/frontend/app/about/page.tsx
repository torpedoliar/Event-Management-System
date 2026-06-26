"use client";

import {
  Users, QrCode, Gift, Trophy, BarChart3, Monitor,
  Shield, Zap, Globe, Database, Code, Server, Layers,
  CheckCircle, ArrowLeft, Github, Mail, Heart
} from 'lucide-react';
import Link from 'next/link';

export default function AboutPage() {
  const features = [
    {
      icon: <QrCode size={24} />,
      title: "Smart Check-in",
      description: "Scan QR Code atau input manual dengan auto check-in. Mendukung pembuatan tamu baru secara otomatis."
    },
    {
      icon: <Gift size={24} />,
      title: "Souvenir Distribution",
      description: "Kelola dan distribusikan souvenir dengan tracking inventory real-time."
    },
    {
      icon: <Trophy size={24} />,
      title: "Lucky Draw",
      description: "Sistem undian berhadiah dengan animasi menarik dan tracking pengambilan hadiah."
    },
    {
      icon: <BarChart3 size={24} />,
      title: "Live Statistics",
      description: "Dashboard statistik real-time untuk monitoring kehadiran dan distribusi."
    },
    {
      icon: <Monitor size={24} />,
      title: "Display Board",
      description: "Tampilan layar besar untuk branding event dengan popup konfirmasi check-in."
    },
    {
      icon: <Users size={24} />,
      title: "Multi-Admin",
      description: "Dukungan banyak admin bekerja bersamaan dengan sinkronisasi real-time."
    }
  ];

  const techStack = [
    { name: "Next.js 15", icon: <Globe size={18} /> },
    { name: "React 18", icon: <Code size={18} /> },
    { name: "TypeScript", icon: <Code size={18} /> },
    { name: "TailwindCSS", icon: <Layers size={18} /> },
    { name: "NestJS", icon: <Server size={18} /> },
    { name: "Prisma", icon: <Database size={18} /> },
    { name: "PostgreSQL", icon: <Database size={18} /> },
    { name: "SSE Realtime", icon: <Zap size={18} /> },
  ];

  const architecture = [
    {
      title: "Frontend",
      icon: <Globe size={18} />,
      description: "Next.js App Router dengan same-origin proxy ke /api untuk performa optimal."
    },
    {
      title: "Backend",
      icon: <Server size={18} />,
      description: "NestJS REST API dengan JWT authentication dan SSE untuk real-time updates."
    },
    {
      title: "Database",
      icon: <Database size={18} />,
      description: "PostgreSQL dengan Prisma ORM untuk type-safe database access."
    },
  ];

  const security = [
    "JWT Authentication untuk admin access",
    "Multi-admin support dengan audit trail",
    "Real-time sync via Server-Sent Events",
    "Database transaction untuk data integrity",
    "Import/Export CSV untuk manajemen data",
    "Responsive design untuk semua device"
  ];

  return (
    <div className="min-h-screen">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,168,83,0.08),transparent_40%)]" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(212,168,83,0.05),transparent_35%)]" />

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-brand-border bg-brand-bg/50 backdrop-blur-xl">
          <div className="container-padded py-4 flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-brand-textMuted hover:text-brand-text transition-colors"
            >
              <ArrowLeft size={18} />
              <span>Kembali</span>
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-primary/10 border border-brand-primary/30 flex items-center justify-center">
                <Users size={18} className="text-brand-primary" />
              </div>
              <span className="text-brand-text font-semibold hidden sm:block">Event Management System</span>
            </div>
          </div>
        </header>

        <main>
          {/* Hero Section */}
          <section className="section-sm md:section">
            <div className="container-padded">
              <div className="max-w-4xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-sm font-medium mb-8">
                  <Zap size={14} />
                  Powered by Modern Technology
                </div>
                <h1 className="text-display text-brand-text mb-6 text-balance">
                  Guest Registration &<br />
                  <span className="gradient-text">Check-in System</span>
                </h1>
                <p className="text-lg md:text-xl text-brand-textMuted max-w-2xl mx-auto text-balance">
                  Sistem registrasi tamu terpadu untuk kebutuhan event. Memudahkan proses check-in,
                  distribusi souvenir, undian berhadiah, dan monitoring real-time di berbagai perangkat.
                </p>
              </div>
            </div>
          </section>

          {/* Features Grid */}
          <section className="section-sm">
            <div className="container-padded">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {features.map((feature, index) => {
                  const wide = index === 0 || index === 3 || index === 5;
                  return (
                    <div
                      key={index}
                      className={`group p-6 md:p-8 rounded-2xl surface-interactive transition-all duration-300 ${wide ? 'md:col-span-2' : ''}`}
                    >
                      <div className="flex flex-col md:flex-row md:items-start gap-5">
                        <div className="w-12 h-12 rounded-xl bg-brand-bgSubtle border border-brand-border flex items-center justify-center text-brand-primary group-hover:scale-110 transition-transform shrink-0">
                          {feature.icon}
                        </div>
                        <div>
                          <h3 className="text-heading-3 text-brand-text mb-2">{feature.title}</h3>
                          <p className="text-body-sm">{feature.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Tech Stack */}
          <section className="section-sm">
            <div className="container-padded">
              <div className="max-w-3xl mx-auto text-center mb-10">
                <h2 className="text-heading-1 text-brand-text mb-3">Tech Stack</h2>
                <p className="text-body">Dibangun dengan teknologi modern dan terpercaya</p>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                {techStack.map((tech, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl surface-interactive transition-colors"
                  >
                    <span className="text-brand-primary">{tech.icon}</span>
                    <span className="text-brand-text font-medium text-sm">{tech.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Architecture */}
          <section className="section-sm">
            <div className="container-padded">
              <Card variant="elevated" className="p-8 md:p-10">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-11 h-11 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center">
                    <Layers className="text-brand-primary" size={22} />
                  </div>
                  <h2 className="text-heading-1 text-brand-text">Arsitektur Sistem</h2>
                </div>
                <div className="grid md:grid-cols-3 gap-5">
                  {architecture.map((item, index) => (
                    <div key={index} className="p-5 rounded-xl bg-brand-bgSubtle border border-brand-border">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-brand-primary">{item.icon}</span>
                        <span className="text-brand-text font-semibold">{item.title}</span>
                      </div>
                      <p className="text-body-sm">{item.description}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </section>

          {/* Security */}
          <section className="section-sm">
            <div className="container-padded">
              <Card variant="elevated" className="p-8 md:p-10">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-11 h-11 rounded-xl bg-brand-success/10 border border-brand-success/20 flex items-center justify-center">
                    <Shield className="text-brand-success" size={22} />
                  </div>
                  <h2 className="text-heading-1 text-brand-text">Keamanan & Fitur</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {security.map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <CheckCircle className="text-brand-success flex-shrink-0" size={18} />
                      <span className="text-brand-text text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-brand-border section-sm">
          <div className="container-padded">
            <div className="max-w-2xl mx-auto text-center">
              <div className="flex items-center justify-center gap-2 mb-4 text-brand-textMuted text-sm">
                <span>Dibuat dengan</span>
                <Heart className="text-brand-danger" size={18} fill="currentColor" />
                <span>oleh</span>
              </div>
              <h3 className="text-heading-2 text-brand-text mb-2">Yohanes Octavian Rizky</h3>
              <p className="text-brand-textMuted text-sm italic mb-6">"Peningkatan kecil setiap hari pada akhirnya menghasilkan hasil yang besar."</p>
              <div className="flex items-center justify-center gap-5 mb-6">
                <a
                  href="https://github.com/torpedoliar/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-brand-textMuted hover:text-brand-text transition-colors"
                >
                  <Github size={18} />
                  <span className="text-sm">GitHub</span>
                </a>
                <a
                  href="mailto:yohanesorizky@gmail.com"
                  className="flex items-center gap-2 text-brand-textMuted hover:text-brand-text transition-colors"
                >
                  <Mail size={18} />
                  <span className="text-sm">Email</span>
                </a>
              </div>
              <p className="text-brand-textDim text-sm mb-1">Version 1.3.0</p>
              <p className="text-brand-textDim text-sm">
                © {new Date().getFullYear()} Guest Registration & Check-in System. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Card({ variant, className, children }: { variant?: 'solid' | 'elevated' | 'glass'; className?: string; children: React.ReactNode }) {
  const variants = {
    solid: 'surface',
    elevated: 'surface-elevated',
    glass: 'surface-glass',
  };
  return <div className={`${variants[variant || 'solid']} ${className || ''}`}>{children}</div>;
}
