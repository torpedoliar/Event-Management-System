import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TournamentsService } from './tournaments.service';
import { MatchScoringService } from './match-scoring.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateScoreDto } from './dto/update-score.dto';
import { ImportTeamsDto } from './dto/import-teams.dto';
import { CreateMatchDto } from './dto/create-match.dto';
import { photosStorage } from '../common/storage';

@Controller('tournaments')
@UseGuards(JwtAuthGuard)
export class TournamentsController {
  constructor(
    private readonly tournaments: TournamentsService,
    private readonly scoring: MatchScoringService,
  ) {}

  // ============================================
  // Tournament Endpoints
  // ============================================

  @Post()
  create(@Body() dto: CreateTournamentDto) {
    return this.tournaments.create(dto);
  }

  @Get()
  findAll(@Query('eventId') eventId?: string) {
    return this.tournaments.findAll(eventId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tournaments.findOne(id);
  }

  @Get(':id/eligible-guests')
  getEligibleGuests(
    @Param('id') tournamentId: string,
    @Query('q') search?: string,
  ) {
    return this.tournaments.getEligibleGuests(tournamentId, search);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTournamentDto,
  ) {
    return this.tournaments.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tournaments.remove(id);
  }

  // ============================================
  // Team Endpoints
  // ============================================

  @Post(':id/teams')
  @UseInterceptors(FileInterceptor('logo', { storage: photosStorage() }))
  createTeam(
    @Param('id') tournamentId: string,
    @Body() dto: CreateTeamDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      dto.logoUrl = `/api/uploads/photos/${file.filename}`;
    }
    return this.tournaments.createTeam(tournamentId, dto);
  }

  @Put('teams/:teamId')
  @UseInterceptors(FileInterceptor('logo', { storage: photosStorage() }))
  updateTeam(
    @Param('teamId') teamId: string,
    @Body() dto: Partial<CreateTeamDto>,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      dto.logoUrl = `/api/uploads/photos/${file.filename}`;
    }
    return this.tournaments.updateTeam(teamId, dto);
  }

  @Delete('teams/:teamId')
  removeTeam(@Param('teamId') teamId: string) {
    return this.tournaments.removeTeam(teamId);
  }

  // ============================================
  // Team Member Endpoints
  // ============================================

  @Post('teams/:teamId/members')
  addTeamMember(
    @Param('teamId') teamId: string,
    @Body() body: { name: string; jerseyNumber?: string; guestId?: string; role?: string },
  ) {
    return this.tournaments.addTeamMember(teamId, body);
  }

  @Delete('teams/members/:memberId')
  removeTeamMember(@Param('memberId') memberId: string) {
    return this.tournaments.removeTeamMember(memberId);
  }

  // ============================================
  // Bulk Import Endpoints
  // ============================================

  @Post(':id/import-teams')
  importTeams(
    @Param('id') tournamentId: string,
    @Body() dto: ImportTeamsDto,
  ) {
    return this.tournaments.importTeams(tournamentId, dto);
  }

  // ============================================
  // Bracket Endpoints
  // ============================================

  @Post(':id/generate-bracket')
  generateBracket(@Param('id') id: string) {
    return this.tournaments.generateBracket(id);
  }

  @Post(':id/regenerate-bracket')
  regenerateBracket(@Param('id') id: string) {
    return this.tournaments.regenerateBracket(id);
  }

  @Get(':id/bracket')
  getBracketView(@Param('id') id: string) {
    return this.tournaments.getBracketView(id);
  }

  // ============================================
  // Match Endpoints
  // ============================================

  @Post(':id/matches')
  createMatch(
    @Param('id') id: string,
    @Body() dto: CreateMatchDto,
  ) {
    return this.tournaments.createMatch(id, dto);
  }

  @Delete('matches/:matchId')
  deleteMatch(@Param('matchId') matchId: string) {
    return this.tournaments.deleteMatch(matchId);
  }

  @Post('matches/:matchId/reset')
  resetMatch(@Param('matchId') matchId: string) {
    return this.tournaments.resetMatch(matchId);
  }

  @Put('matches/:matchId')
  updateMatch(
    @Param('matchId') matchId: string,
    @Body() body: { scheduledAt?: string; court?: string; teamAId?: string; teamBId?: string },
  ) {
    return this.tournaments.updateMatch(matchId, body);
  }

  @Get(':id/matches')
  getMatches(
    @Param('id') id: string,
    @Query('status') status?: string,
  ) {
    return this.tournaments.getMatchesByTournament(id, status);
  }

  @Get('matches/upcoming')
  getUpcomingMatches(@Query('tournamentId') tournamentId: string) {
    return this.tournaments.getUpcomingMatches(tournamentId);
  }

  @Get('matches/live')
  getLiveMatches(@Query('tournamentId') tournamentId: string) {
    return this.tournaments.getLiveMatches(tournamentId);
  }

  @Get('matches/:matchId')
  getMatch(@Param('matchId') matchId: string) {
    return this.tournaments.getMatch(matchId);
  }

  @Post('matches/:matchId/start')
  startMatch(@Param('matchId') matchId: string) {
    return this.scoring.startMatch(matchId);
  }

  @Post('matches/:matchId/finish')
  finishMatch(@Param('matchId') matchId: string) {
    return this.scoring.finishMatch(matchId);
  }

  @Post('matches/:matchId/score')
  updateScore(
    @Param('matchId') matchId: string,
    @Body() dto: UpdateScoreDto,
  ) {
    return this.scoring.updateScore(matchId, dto);
  }

  @Post('matches/:matchId/cancel')
  cancelMatch(@Param('matchId') matchId: string) {
    return this.scoring.cancelMatch(matchId);
  }

  @Post('matches/:matchId/walkover')
  awardWalkover(
    @Param('matchId') matchId: string,
    @Body() body: { winnerId: string },
  ) {
    return this.scoring.awardWalkover(matchId, body.winnerId);
  }

  // ============================================
  // Statistics Endpoints
  // ============================================

  @Get(':id/stats')
  getStats(@Param('id') id: string) {
    return this.tournaments.getTournamentStats(id);
  }
}
