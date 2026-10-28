import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from './prisma/prisma.service';

/**
 * Health check adalah sinyal operasional: kalau ia salah, operator mengejar
 * masalah yang tidak ada (atau melewatkan yang nyata). Tes ini mengunci
 * perhitungan memori terhadap batas heap V8, bukan terhadap `heapTotal`.
 */
describe('HealthController', () => {
  const healthyDb = { status: 'healthy', responseTime: 1, details: { connected: true } };
  const unhealthyDb = { status: 'unhealthy', responseTime: 0, details: { connected: false } };

  async function build(dbResult: any) {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: { healthCheck: jest.fn().mockResolvedValue(dbResult) },
        },
      ],
    }).compile();

    return moduleRef.get(HealthController);
  }

  it('melaporkan sehat tepat setelah boot (regresi: dulu selalu degraded)', async () => {
    const controller = await build(healthyDb);
    const result = await controller.check();

    expect(result.checks.memory.status).toBe('healthy');
    expect(result.status).toBe('healthy');
  });

  it('menghitung pemakaian terhadap batas heap, bukan heapTotal', async () => {
    const controller = await build(healthyDb);
    const { memory } = (await controller.check()).checks;

    // Batas heap selalu jauh di atas heap yang sudah dialokasikan.
    expect(memory.heapLimit).toBeGreaterThan(memory.heapTotal);

    // Rasio terhadap batas harus kecil pada proses yang baru hidup. Rasio
    // terhadap heapTotal akan mendekati 100% dan membuat tes ini gagal.
    expect(memory.percentUsed).toBeLessThan(50);
  });

  it('menandai unhealthy saat database bermasalah', async () => {
    const controller = await build(unhealthyDb);
    const result = await controller.check();

    expect(result.status).toBe('unhealthy');
    expect(result.checks.database.status).toBe('unhealthy');
  });

  it('menyertakan uptime dan versi', async () => {
    const controller = await build(healthyDb);
    const result = await controller.check();

    expect(result.uptime).toBeGreaterThanOrEqual(0);
    expect(typeof result.version).toBe('string');
  });
});
