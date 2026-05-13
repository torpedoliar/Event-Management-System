import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import * as fs from 'fs';
import { join } from 'path';
// Use require to avoid ESM interop issues
// eslint-disable-next-line @typescript-eslint/no-var-requires
const compression = require('compression');
import helmet from 'helmet';

async function bootstrap() {
  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  const useHttps = process.env.USE_HTTPS === 'true';

  let app;

  if (useHttps) {
    // HTTPS mode - load SSL certificates
    const sslKeyPath = process.env.SSL_KEY_PATH || './certs/server.key';
    const sslCertPath = process.env.SSL_CERT_PATH || './certs/server.crt';

    if (!fs.existsSync(sslKeyPath) || !fs.existsSync(sslCertPath)) {
      console.error('❌ SSL certificates not found!');
      console.error(`   Key: ${sslKeyPath}`);
      console.error(`   Cert: ${sslCertPath}`);
      console.error('   Run generate-ssl.bat to create self-signed certificates.');
      process.exit(1);
    }

    const httpsOptions = {
      key: fs.readFileSync(sslKeyPath),
      cert: fs.readFileSync(sslCertPath),
    };
    app = await NestFactory.create(AppModule, { httpsOptions });
    console.log('🔒 Running in HTTPS mode');
  } else {
    // HTTP mode (default)
    app = await NestFactory.create(AppModule);
    console.log('🔓 Running in HTTP mode');
  }

  app.setGlobalPrefix('api');
  
  // Use Helmet for standard security headers
  app.use(helmet());
  
  app.enableCors({ origin: process.env.CORS_ORIGIN || '*' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Enable gzip compression for better bandwidth usage across many clients
  // Skip compression for SSE (text/event-stream)
  app.use(compression({
    filter: (req: any, res: any) => {
      const accept = req.headers?.accept || '';
      if (typeof accept === 'string' && accept.includes('text/event-stream')) return false;
      const ct = res.getHeader && res.getHeader('Content-Type');
      if (typeof ct === 'string' && ct.includes('text/event-stream')) return false;
      return compression.filter ? (compression as any).filter(req, res) : true;
    }
  } as any));

  // Serve static uploads with long cache lifetime; files are content-addressed by unique name
  app.use(
    '/api/uploads',
    express.static(join(process.cwd(), 'uploads'), {
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
      etag: true,
      immutable: true as any,
    } as any),
  );

  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
  
  const protocol = useHttps ? 'https' : 'http';
  console.log(`🚀 Server running on ${protocol}://${host}:${port}`);
}

bootstrap();
