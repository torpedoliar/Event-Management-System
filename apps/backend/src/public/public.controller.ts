import { Body, Controller, Get, Post, Query, Req, Res, Headers, UnauthorizedException, Inject } from '@nestjs/common';
import { Request } from 'express';
import { SkipThrottle } from '@nestjs/throttler';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { GuestsService } from '../guests/guests.service';
import { SouvenirsService } from '../souvenirs/souvenirs.service';
import { Response } from 'express';
import { onEvent, emitEvent } from '../common/sse';
import { JwtService } from '@nestjs/jwt';

@SkipThrottle({ default: true, short: true, medium: true, long: true })
@Controller('public')
export class PublicController {
  constructor(
    private readonly guests: GuestsService,
    private readonly souvenirs: SouvenirsService,
    private readonly jwtService: JwtService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) { }

  // Extract user info from JWT token if present
  private extractUserFromToken(authHeader?: string): { id?: string; name?: string } {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return {};
    try {
      const token = authHeader.substring(7);
      const payload = this.jwtService.verify(token);
      return {
        id: payload.sub,
        name: payload.displayName || payload.username || 'Admin',
      };
    } catch {
      return {};
    }
  }

  @Get('guests/search')
  search(@Query('guestId') guestId?: string, @Query('name') name?: string, @Query('exact') exact?: string) {
    return this.guests.publicSearch({ guestId, name, exact: exact === 'true' });
  }

  @Post('guests/checkin')
  async checkin(
    @Body('guestId') guestId: string,
    @Headers('authorization') authHeader?: string,
  ) {
    const user = this.extractUserFromToken(authHeader);
    const updated = await this.guests.checkInByGuestId(guestId, user.id, user.name);
    emitEvent({ type: 'checkin', data: updated });
    return updated;
  }

  @Post('guests/checkin-by-id')
  async checkinById(
    @Body('id') id: string,
    @Headers('authorization') authHeader?: string,
  ) {
    const user = this.extractUserFromToken(authHeader);
    const updated = await this.guests.checkIn(id, user.id, user.name);
    emitEvent({ type: 'checkin', data: updated });
    return updated;
  }

  @Post('guests/checkin-qr')
  async checkinQr(
    @Body('qrCode') qrCode: string,
    @Headers('authorization') authHeader?: string,
  ) {
    const user = this.extractUserFromToken(authHeader);
    const updated = await this.guests.checkInByQr(qrCode, user.id, user.name);
    emitEvent({ type: 'checkin', data: updated });
    return updated;
  }

  @Post('guests/create-checkin')
  async createAndCheckin(
    @Body('guestIdOrName') guestIdOrName: string,
    @Headers('authorization') authHeader?: string,
  ) {
    const user = this.extractUserFromToken(authHeader);
    if (!user.id) {
      throw new UnauthorizedException('Login diperlukan untuk membuat tamu baru');
    }
    const newGuest = await this.guests.createAndCheckIn(guestIdOrName, user.id, user.name);
    emitEvent({ type: 'checkin', data: newGuest });
    emitEvent({ type: 'guest-update', data: { action: 'create' } });
    return newGuest;
  }

  @Post('guests/checkin-offline')
  async checkinOffline(
    @Body('stationId') stationId: string,
    @Body('guestIdentifier') guestIdentifier: string,
    @Body('clientTimestamp') clientTimestamp: string,
    @Body('stationName') stationName?: string,
  ) {
    const result = await this.guests.checkInOffline(
      stationId,
      guestIdentifier,
      clientTimestamp,
      stationName
    );
    
    // Emit event for real-time update (even for offline check-ins)
    if (result.success) {
      emitEvent({ type: 'checkin', data: result.guest });
    }
    
    return result;
  }

  @Post('guests/sync-batch')
  async syncBatch(
    @Body('stationId') stationId: string,
    @Body('lastSyncAt') lastSyncAt?: string,
    @Body('pendingCheckins') pendingCheckins?: Array<{
      guestIdentifier: string;
      clientTimestamp: string;
      photo?: string;
    }>,
    @Body('stationName') stationName?: string,
  ) {
    const lastSyncDate = lastSyncAt ? new Date(lastSyncAt) : null;
    const checkins = pendingCheckins || [];

    const result = await this.guests.syncBatchFromStation(
      stationId,
      lastSyncDate,
      checkins,
      stationName
    );

    // Emit distinct sync_complete event with counts
    if (result.successCount > 0 || result.conflictCount > 0) {
      emitEvent({ 
        type: 'sync_complete', 
        data: { 
          stationId,
          stationName,
          processed: result.processed,
          successCount: result.successCount,
          conflictCount: result.conflictCount,
          serverTimestamp: result.serverTimestamp
        } 
      });
    }

    return result;
  }

  @Post('souvenirs/sync-batch')
  async syncSouvenirBatch(
    @Body('stationId') stationId: string,
    @Body('lastSyncAt') lastSyncAt?: string,
    @Body('pendingTakes') pendingTakes?: Array<{
      guestIdentifier: string;
      souvenirId: string;
      clientTimestamp: string;
    }>,
    @Body('stationName') stationName?: string,
  ) {
    const lastSyncDate = lastSyncAt ? new Date(lastSyncAt) : null;
    const takes = pendingTakes || [];

    const result = await this.souvenirs.syncBatchFromStation(
      stationId,
      lastSyncDate,
      takes,
      stationName
    );

    // Emit distinct sync_complete event with counts
    if (result.successCount > 0 || result.conflictCount > 0) {
      emitEvent({ 
        type: 'sync_complete', 
        data: { 
          stationId,
          stationName,
          processed: result.processed,
          successCount: result.successCount,
          conflictCount: result.conflictCount,
          serverTimestamp: result.serverTimestamp,
          type: 'souvenir'
        } 
      });
      // Emit souvenir_given so UI refreshes inventory
      emitEvent({ type: 'souvenir_given', data: {} });
    }

    return result;
  }

  @Get('guests/history')
  history(@Query('limit') limit?: string) {
    const lim = limit ? Number(limit) : 20;
    return this.guests.publicHistory(lim);
  }

  @Get('stream')
  async stream(@Req() req: Request, @Res() res: Response, @Query('token') token?: string) {
    // R-001: Require valid JWT to access the event stream.
    // Unauthenticated clients receive 401 – no SSE connection is opened.
    if (!token) {
      res.status(401).json({ message: 'Authentication required for event stream' });
      return;
    }

    try {
      this.jwtService.verify(token);
    } catch {
      res.status(401).json({ message: 'Invalid or expired token' });
      return;
    }

    // R-001: Replace wildcard CORS with the actual request origin
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Send 4KB of padding to bypass proxy/router buffering (e.g. NGINX default proxy_buffering)
    res.write(':' + Array(4096).join(' ') + '\n\n');

    const send = (event: string, data: any) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const off = onEvent((ev) => send(ev.type, ev.data));

    const heartbeat = setInterval(() => {
      res.write(`event: ping\n`);
      res.write(`data: {}\n\n`);
    }, 25000);

    reqOnClose(res, () => {
      clearInterval(heartbeat);
      off();
    });
  }

  @Get('health')
  async health() {
    const CACHE_KEY = 'public:health';
    const CACHE_TTL = 5000; // 5 seconds - prevents DB hammering from many clients

    // Try cache first (Redis if available, in-memory fallback)
    const cached = await this.cacheManager.get<string>(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Update timestamp to current so the client sees fresh timing
      parsed.timestamp = new Date().toISOString();
      return parsed;
    }

    // Cache miss: query DB once, then cache for all clients
    const activeEvent = await this.guests.getActiveEvent();

    const result = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      eventId: activeEvent?.id || null,
      eventName: activeEvent?.name || null,
      allowOfflineMode: activeEvent?.allowOfflineMode ?? true,
      offlineSyncInterval: activeEvent?.offlineSyncInterval ?? 30,
      offlineQueueLimit: activeEvent?.offlineQueueLimit ?? 500
    };

    // Store in cache
    await this.cacheManager.set(CACHE_KEY, JSON.stringify(result), CACHE_TTL);

    return result;
  }
}

function reqOnClose(res: Response, cb: () => void) {
  // @ts-ignore
  const req = res.req as any;
  req.on('close', cb);
}
