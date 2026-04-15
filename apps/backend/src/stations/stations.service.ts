import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterStationDto } from './dto/register-station.dto';
import { StationResponseDto } from './dto/station-response.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StationsService {
  constructor(private prisma: PrismaService) {}

  async registerStation(dto: RegisterStationDto): Promise<StationResponseDto> {
    const { stationId, stationName, eventId } = dto;

    // Verify event exists
    const event = await this.prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    // If stationId provided, check if it exists
    if (stationId) {
      const existing = await this.prisma.checkinStation.findUnique({
        where: { stationId }
      });

      if (existing) {
        // Update existing station
        const updated = await this.prisma.checkinStation.update({
          where: { id: existing.id },
          data: {
            name: stationName,
            isActive: true,
            updatedAt: new Date()
          }
        });

        return this.mapToResponse(updated);
      }
    }

    // Create new station
    const newStationId = stationId || uuidv4();
    
    const station = await this.prisma.checkinStation.create({
      data: {
        stationId: newStationId,
        name: stationName,
        eventId
      }
    });

    return this.mapToResponse(station);
  }

  async getStationsByEvent(eventId: string): Promise<StationResponseDto[]> {
    // OPTIMIZATION: Single query with _count instead of N+1 count queries
    const stations = await this.prisma.checkinStation.findMany({
      where: {
        eventId,
        isActive: true
      },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: { checkins: true }
        }
      }
    });

    return stations.map(station => ({
      ...this.mapToResponse(station),
      checkinCount: station._count.checkins
    }));
  }

  async getStationById(stationId: string): Promise<StationResponseDto | null> {
    const station = await this.prisma.checkinStation.findUnique({
      where: { stationId }
    });

    if (!station) return null;

    return this.mapToResponse(station);
  }

  async updateStationLastSync(stationId: string): Promise<void> {
    await this.prisma.checkinStation.update({
      where: { stationId },
      data: { lastSyncAt: new Date() }
    });
  }

  async deactivateStation(stationId: string): Promise<void> {
    const station = await this.prisma.checkinStation.findUnique({
      where: { stationId }
    });

    if (!station) {
      throw new NotFoundException(`Station with ID ${stationId} not found`);
    }

    await this.prisma.checkinStation.update({
      where: { stationId },
      data: { isActive: false }
    });
  }

  private mapToResponse(station: any): StationResponseDto {
    return {
      id: station.id,
      name: station.name,
      stationId: station.stationId,
      eventId: station.eventId,
      isActive: station.isActive,
      lastSyncAt: station.lastSyncAt,
      createdAt: station.createdAt,
      updatedAt: station.updatedAt
    };
  }
}
