"use client";

import { 
  Users, QrCode, Gift, Trophy, BarChart3, Monitor, Settings, 
  Shield, Zap, Globe, Database, Code, Server, Layers,
  CheckCircle, ArrowLeft, Github, Mail, Heart
} from 'lucide-react';
import Link from 'next/link';

export default function AboutPage() {
  const features = [
    {
      icon: <QrCode className="text-brand-primary" size={24} />,
      title: "Smart Check-in",
      description: "Scan QR Code atau input manual dengan auto check-in. Mendukung pembuatan tamu baru secara otomatis."
    },
    {
      icon: <Gift className="text-brand-accent" size={24} />,
      title: "Souvenir Distribution",
      description: "Kelola dan distribusikan souvenir dengan tracking inventory real-time."
    },
    {
      icon: <Trophy className="text-brand-warning" size={24} />,
      title: "Lucky Draw",
      description: "Sistem undian berhadiah dengan animasi menarik dan tracking pengambilan hadiah."
    },
    {
      icon: <BarChart3 className="text-brand-success" size={24} />,
      title: "Live Statistics",
      description: "Dashboard statistik real-time untuk monitoring kehadiran dan distribusi."
    },
    {
      icon: <Monitor className="text-brand-danger" size={24} />,
      title: "Display Board",
      description: "Tampilan layar besar untuk branding event dengan popup konfirmasi check-in."
    },
    {
      icon: <Users className="text-brand-info" size={24} />,
      title: "Multi-Admin",
      description: "Dukungan banyak admin bekerja bersamaan dengan sinkronisasi real-time."
    }
  ];

  const techStack = [
    { name: "Next.js 14", icon: <Globe size={18} />, color: "text-white" },
    { name: "React 18", icon: <Code size={18} />, color: "text-brand-primary" },
    { name: "TypeScript", icon: <Code size={18} />, color: "text-brand-primarySoft" },
    { name: "TailwindCSS", icon: <Layers size={18} />, color: "text-brand-info" },
    { name: "NestJS", icon: <Server size={18} />, color: "text-brand-danger" },
    { name: "Prisma", icon: <Database size={18} />, color: "text-brand-success" },
    { name: "PostgreSQL", icon: <Database size={18} />, color: "text-brand-primary" },
    { name: "SSE Realtime", icon: <Zap size={18} />, color: "text-brand-warning" },
  ];

  return (
    <div className="min-h-screen">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-brand-secondary via-brand-primary/10 to-brand-secondary" />
      <div className="fixed inset-0 bg-[url('/grid.svg')] opacity-10" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link 
              href="/"
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Kembali</span>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center">
                <Users size={18} className="text-white" />
              </div>
              <span className="text-white font-semibold">Event Management System</span>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-sm font-medium mb-6">
              <Zap size={14} />
              Powered by Modern Technology
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Guest Registration &<br />
              <span className="bg-gradient-to-r from-brand-primary via-brand-primarySoft to-brand-accent bg-clip-text text-transparent">
                Check-in System
              </span>
            </h1>
            <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto">
              Sistem registrasi tamu terpadu untuk kebutuhan event. Memudahkan proses check-in, 
              distribusi souvenir, undian berhadiah, dan monitoring real-time di berbagai perangkat.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Tech Stack */}
          <div className="mb-20">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Tech Stack</h2>
              <p className="text-white/60">Dibangun dengan teknologi modern dan terpercaya</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {techStack.map((tech, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
                >
                  <span className={tech.color}>{tech.icon}</span>
                  <span className="text-white font-medium text-sm">{tech.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Architecture */}
          <div className="mb-20">
            <div className="p-8 rounded-2xl bg-gradient-to-br from-brand-primary/10 to-brand-accent/10 border border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-brand-primary/20 flex items-center justify-center">
                  <Layers className="text-brand-primary" size={20} />
                </div>
                <h2 className="text-xl font-bold text-white">Arsitektur Sistem</h2>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="p-4 rounded-xl bg-black/20 border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="text-brand-primary" size={18} />
                    <span className="text-white font-medium">Frontend</span>
                  </div>
                  <p className="text-white/60 text-sm">Next.js dengan App Router, menggunakan same-origin proxy ke <code className="text-brand-primary">/api</code></p>
                </div>
                <div className="p-4 rounded-xl bg-black/20 border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Server className="text-brand-danger" size={18} />
                    <span className="text-white font-medium">Backend</span>
                  </div>
                  <p className="text-white/60 text-sm">NestJS REST API dengan JWT authentication dan SSE untuk real-time updates</p>
                </div>
                <div className="p-4 rounded-xl bg-black/20 border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="text-brand-success" size={18} />
                    <span className="text-white font-medium">Database</span>
                  </div>
                  <p className="text-white/60 text-sm">PostgreSQL dengan Prisma ORM untuk type-safe database access</p>
                </div>
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="mb-20">
            <div className="p-8 rounded-2xl bg-gradient-to-br from-brand-success/10 to-brand-info/10 border border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-brand-success/20 flex items-center justify-center">
                  <Shield className="text-brand-success" size={20} />
                </div>
                <h2 className="text-xl font-bold text-white">Keamanan & Fitur</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  "JWT Authentication untuk admin access",
                  "Multi-admin support dengan audit trail",
                  "Real-time sync via Server-Sent Events",
                  "Database transaction untuk data integrity",
                  "Import/Export CSV untuk manajemen data",
                  "Responsive design untuk semua device"
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="text-brand-success flex-shrink-0" size={18} />
                    <span className="text-white/80 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 pt-12">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="text-white/60">Dibuat dengan</span>
                <Heart className="text-brand-danger" size={18} fill="currentColor" />
                <span className="text-white/60">oleh</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Yohanes Octavian Rizky</h3>
              <p className="text-white/60 text-sm italic mb-4">"Peningkatan kecil setiap hari pada akhirnya menghasilkan hasil yang besar."</p>
              <div className="flex items-center justify-center gap-4 mb-6">
                <a 
                  href="https://github.com/torpedoliar/" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                >
                  <Github size={18} />
                  <span className="text-sm">GitHub</span>
                </a>
                <a 
                  href="mailto:yohanesorizky@gmail.com"
                  className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                >
                  <Mail size={18} />
                  <span className="text-sm">Email</span>
                </a>
              </div>
              <p className="text-white/40 text-sm mb-2">
                Version 1.3.0
              </p>
              <p className="text-white/40 text-sm">
                © {new Date().getFullYear()} Guest Registration & Check-in System. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
