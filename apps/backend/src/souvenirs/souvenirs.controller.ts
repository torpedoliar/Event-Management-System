import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards, Request } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { SouvenirsService } from './souvenirs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { emitEvent } from '../common/sse';

@Controller('souvenirs')
export class SouvenirsController {
    constructor(private readonly souvenirs: SouvenirsService) { }

    @UseGuards(JwtAuthGuard)
    @Get()
    list() {
        return this.souvenirs.list();
    }

    @UseGuards(JwtAuthGuard)
    @Get('stats')
    async getStats() {
        return this.souvenirs.getStats();
    }

    @UseGuards(JwtAuthGuard)
    @Post()
    create(@Body() body: {
        name: string;
        quantity: number;
        description?: string;
        imageUrl?: string;
    }) {
        return this.souvenirs.create(body);
    }

    @UseGuards(JwtAuthGuard)
    @Put(':id')
    update(@Param('id') id: string, @Body() body: {
        name?: string;
        quantity?: number;
        description?: string;
        imageUrl?: string;
    }) {
        return this.souvenirs.update(id, body);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    delete(@Param('id') id: string) {
        return this.souvenirs.delete(id);
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/reset')
    async reset(@Param('id') id: string) {
        const res = await this.souvenirs.reset(id);
        emitEvent({ type: 'souvenir_reset', data: { souvenirId: id } });
        return res;
    }

    // Give souvenir to guest
    @SkipThrottle({ default: true, short: true, medium: true, long: true })
    @UseGuards(JwtAuthGuard)
    @Post('give')
    async giveSouvenir(@Body() body: { guestId: string; souvenirId: string }, @Request() req: any) {
        const adminId = req.user?.sub;
        const adminName = req.user?.displayName || req.user?.username || 'Admin';
        const result = await this.souvenirs.giveSouvenir(body.guestId, body.souvenirId, adminId, adminName);
        emitEvent({ type: 'souvenir_given', data: result });
        return result;
    }

    // Create guest and give souvenir in one operation
    @SkipThrottle({ default: true, short: true, medium: true, long: true })
    @UseGuards(JwtAuthGuard)
    @Post('give-create')
    async createAndGiveSouvenir(@Body() body: { guestIdOrName: string; souvenirId: string }, @Request() req: any) {
        const adminId = req.user?.sub;
        const adminName = req.user?.displayName || req.user?.username || 'Admin';
        const result = await this.souvenirs.createGuestAndGiveSouvenir(
            body.guestIdOrName,
            body.souvenirId,
            adminId,
            adminName
        );
        emitEvent({ type: 'guest_created_souvenir', data: result });
        return result;
    }

    // Remove souvenir take
    @UseGuards(JwtAuthGuard)
    @Delete('take/:guestId/:souvenirId')
    async removeTake(@Param('guestId') guestId: string, @Param('souvenirId') souvenirId: string) {
        const result = await this.souvenirs.removeSouvenirTake(guestId, souvenirId);
        emitEvent({ type: 'souvenir_removed', data: { guestId, souvenirId } });
        return result;
    }

    // Get guest's souvenir takes
    @UseGuards(JwtAuthGuard)
    @Get('guest/:guestId')
    getGuestTakes(@Param('guestId') guestId: string) {
        return this.souvenirs.getGuestSouvenirTakes(guestId);
    }

    // Prize collection endpoints
    @UseGuards(JwtAuthGuard)
    @Get('prizes/winners')
    getAllPrizeWinners() {
        return this.souvenirs.getAllPrizeWinners();
    }

    @UseGuards(JwtAuthGuard)
    @Get('prizes/uncollected')
    getUncollectedPrizes() {
        return this.souvenirs.getUncollectedPrizes();
    }

    @UseGuards(JwtAuthGuard)
    @Get('prizes/guest/:guestId')
    getGuestPrizeWins(@Param('guestId') guestId: string) {
        return this.souvenirs.getGuestPrizeWins(guestId);
    }

    @UseGuards(JwtAuthGuard)
    @Post('prizes/collect')
    async collectPrize(@Body() body: { prizeWinnerId: string }, @Request() req: any) {
        const adminId = req.user?.sub;
        const adminName = req.user?.displayName || req.user?.username || 'Admin';
        const result = await this.souvenirs.collectPrize(
            body.prizeWinnerId,
            adminId,
            adminName
        );
        emitEvent({ type: 'prize_collected', data: result });
        return result;
    }

    @UseGuards(JwtAuthGuard)
    @Delete('prizes/collect/:prizeWinnerId')
    async uncollectPrize(@Param('prizeWinnerId') prizeWinnerId: string) {
        const result = await this.souvenirs.uncollectPrize(prizeWinnerId);
        emitEvent({ type: 'prize_uncollected', data: { prizeWinnerId } });
        return result;
    }
}
