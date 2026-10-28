import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';

export interface OpsMetrics {
  generatedAt: string;
  activeEvent: {
    id: string;
    name: string;
    isActive: boolean;
  } | null;
  guests: {
    total: number;
    checkedIn: number;
    notCheckedIn: number;
    /** Persentase kehadiran, dibulatkan 2 desimal. */
    attendanceRate: number;
  };
  checkins: {
    total: number;
    last24h: number;
    offline: number;
    duplicate: number;
  };
  stations: {
    total: number;
    active: number;
    /** Waktu sinkron terakhir antar semua station (null bila belum ada). */
    lastSyncAt: string | null;
    /** Station yang belum sinkron lebih dari 30 menit. */
    stale: number;
  };
}

const STALE_STATION_MS = 30 * 60 * 1000;

/**
 * Metrik operasional untuk dipantau saat event berlangsung.
 *
 * Tujuannya menjawab pertanyaan praktis saat acara: apakah semua station
 * masih tersinkron, berapa banyak check-in offline yang masuk, dan apakah
 * ada konflik duplikat yang perlu ditindaklanjuti.
 */
@Injectable()
export class OpsService {
  constructor(
    private prisma: PrismaService,
    private events: EventsService,
  ) {}

  async getMetrics(): Promise<OpsMetrics> {
    const now = new Date();
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const event = await this.events.getActive();

    if (!event) {
      return {
        generatedAt: now.toISOString(),
        activeEvent: null,
        guests: { total: 0, checkedIn: 0, notCheckedIn: 0, attendanceRate: 0 },
        checkins: { total: 0, last24h: 0, offline: 0, duplicate: 0 },
        stations: { total: 0, active: 0, lastSyncAt: null, stale: 0 },
      };
    }

    const eventId = event.id;

    const [
      totalGuests,
      checkedInGuests,
      totalCheckins,
      checkinsLast24h,
      offlineCheckins,
      duplicateCheckins,
      stations,
    ] = await this.prisma.$transaction([
      this.prisma.guest.count({ where: { eventId } }),
      this.prisma.guest.count({ where: { eventId, checkedIn: true } }),
      this.prisma.guestCheckin.count({ where: { guest: { eventId } } }),
      this.prisma.guestCheckin.count({
        where: { guest: { eventId }, checkinAt: { gte: since24h } },
      }),
      this.prisma.guestCheckin.count({
        where: { guest: { eventId }, isOffline: true },
      }),
      this.prisma.guestCheckin.count({
        where: { guest: { eventId }, isDuplicate: true },
      }),
      this.prisma.checkinStation.findMany({
        where: { eventId },
        select: { isActive: true, lastSyncAt: true },
      }),
    ]);

    const syncTimes = stations
      .map((s) => s.lastSyncAt)
      .filter((d): d is Date => d instanceof Date);

    const lastSyncAt = syncTimes.length
      ? new Date(Math.max(...syncTimes.map((d) => d.getTime())))
      : null;

    const stale = stations.filter(
      (s) => !s.lastSyncAt || now.getTime() - s.lastSyncAt.getTime() > STALE_STATION_MS,
    ).length;

    const attendanceRate =
      totalGuests === 0 ? 0 : Math.round((checkedInGuests / totalGuests) * 10000) / 100;

    return {
      generatedAt: now.toISOString(),
      activeEvent: { id: event.id, name: event.name, isActive: true },
      guests: {
        total: totalGuests,
        checkedIn: checkedInGuests,
        notCheckedIn: totalGuests - checkedInGuests,
        attendanceRate,
      },
      checkins: {
        total: totalCheckins,
        last24h: checkinsLast24h,
        offline: offlineCheckins,
        duplicate: duplicateCheckins,
      },
      stations: {
        total: stations.length,
        active: stations.filter((s) => s.isActive).length,
        lastSyncAt: lastSyncAt ? lastSyncAt.toISOString() : null,
        stale,
      },
    };
  }
}
