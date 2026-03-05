import { Body, Controller, Get, Post, Query, Res, Headers, UnauthorizedException } from '@nestjs/common';
import { GuestsService } from '../guests/guests.service';
import { Response } from 'express';
import { onEvent, emitEvent } from '../common/sse';
import { JwtService } from '@nestjs/jwt';

@Controller('public')
export class PublicController {
  constructor(
    private readonly guests: GuestsService,
    private readonly jwtService: JwtService,
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
  search(@Query('guestId') guestId?: string, @Query('name') name?: string) {
    return this.guests.publicSearch({ guestId, name });
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

  @Get('guests/history')
  history(@Query('limit') limit?: string) {
    const lim = limit ? Number(limit) : 20;
    return this.guests.publicHistory(lim);
  }

  @Get('stream')
  async stream(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const send = (event: string, data: any) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const off = onEvent((ev) => {
      if (ev.type === 'checkin') send('checkin', ev.data);
      if (ev.type === 'uncheckin') send('uncheckin', ev.data);
      if (ev.type === 'config') send('config', ev.data);
      if (ev.type === 'preview') send('preview', ev.data);
      if (ev.type === 'prize_draw') send('prize_draw', ev.data);
      if (ev.type === 'prize_reset') send('prize_reset', ev.data);
      if (ev.type === 'prize_collected') send('prize_collected', ev.data);
      if (ev.type === 'prize_uncollected') send('prize_uncollected', ev.data);
      if (ev.type === 'guest-update') send('guest-update', ev.data);
      if (ev.type === 'guest_created_souvenir') send('guest_created_souvenir', ev.data);
      if (ev.type === 'souvenir_given') send('souvenir_given', ev.data);
      if (ev.type === 'souvenir_removed') send('souvenir_removed', ev.data);
      if (ev.type === 'souvenir_reset') send('souvenir_reset', ev.data);
      if (ev.type === 'event_change') send('event_change', ev.data);
    });

    const heartbeat = setInterval(() => {
      res.write(`event: ping\n`);
      res.write(`data: {}\n\n`);
    }, 25000);

    reqOnClose(res, () => {
      clearInterval(heartbeat);
      off();
    });
  }
}

function reqOnClose(res: Response, cb: () => void) {
  // @ts-ignore
  const req = res.req as any;
  req.on('close', cb);
}
