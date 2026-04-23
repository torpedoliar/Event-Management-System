import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { PrizesService } from './prizes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { emitEvent } from '../common/sse';

@Controller('prizes')
export class PrizesController {
    constructor(private readonly prizes: PrizesService) { }

    @UseGuards(JwtAuthGuard)
    @Get('eligible-guests')
    async getEligibleGuests(
        @Query('page') page?: string,
        @Query('pageSize') pageSize?: string,
        @Query('q') q?: string,
        @Query('guestId') guestId?: string,
        @Query('tab') tab?: string,
    ) {
        return this.prizes.getEligibleGuests({
            page: parseInt(page || '1'),
            pageSize: parseInt(pageSize || '50'),
            q: q?.trim(),
            guestId: guestId?.trim(),
            tab: tab as 'all' | 'eligible' | 'won' || 'all',
        });
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    list() {
        return this.prizes.list();
    }

    @UseGuards(JwtAuthGuard)
    @Get('stats')
    async getStats() {
        return this.prizes.getStats();
    }

    @UseGuards(JwtAuthGuard)
    @Post()
    create(@Body() body: { 
        name: string; 
        quantity: number; 
        description?: string;
        category?: string;
        allowMultipleWins?: boolean;
    }) {
        return this.prizes.create(body);
    }

    @UseGuards(JwtAuthGuard)
    @Put(':id')
    update(@Param('id') id: string, @Body() body: { 
        name?: string; 
        quantity?: number; 
        description?: string;
        category?: string;
        allowMultipleWins?: boolean;
    }) {
        return this.prizes.update(id, body);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    delete(@Param('id') id: string) {
        return this.prizes.delete(id);
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/draw')
    async draw(@Param('id') id: string, @Body('count') count?: number) {
        const winners = await this.prizes.drawWinners(id, count || 1);
        emitEvent({ type: 'prize_draw', data: { prizeId: id, winners } });
        return winners;
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id/winners/:guestId')
    async deleteWinner(@Param('id') id: string, @Param('guestId') guestId: string) {
        const res = await this.prizes.deleteWinner(id, guestId);
        emitEvent({ type: 'prize_reset', data: { prizeId: id } }); // reuse prize_reset event to trigger refresh
        return res;
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/reset')
    async reset(@Param('id') id: string) {
        const res = await this.prizes.resetWinners(id);
        emitEvent({ type: 'prize_reset', data: { prizeId: id } });
        return res;
    }
}
