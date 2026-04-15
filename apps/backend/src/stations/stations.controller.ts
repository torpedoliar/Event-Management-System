import { Controller, Post, Get, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { StationsService } from './stations.service';
import { RegisterStationDto } from './dto/register-station.dto';
import { StationResponseDto } from './dto/station-response.dto';

@Controller('api/stations')
export class StationsController {
  constructor(private readonly stationsService: StationsService) {}

  @Post('register')
  @HttpCode(HttpStatus.OK)
  async registerStation(@Body() dto: RegisterStationDto): Promise<StationResponseDto> {
    return this.stationsService.registerStation(dto);
  }

  @Get()
  async getStations(@Query('eventId') eventId: string): Promise<StationResponseDto[]> {
    if (!eventId) {
      return [];
    }
    return this.stationsService.getStationsByEvent(eventId);
  }
}
