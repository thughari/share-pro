import * as mediasoup from 'mediasoup';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });

const mediaCodecs: mediasoup.types.RtpCodecCapability[] = [
  { kind: 'audio', mimeType: 'audio/opus', clockRate: 48000, channels: 2 },
  { kind: 'video', mimeType: 'video/VP8', clockRate: 90000, parameters: { 'x-google-start-bitrate': 1000 } }
];

async function boot(): Promise<void> {
  const worker = await mediasoup.createWorker({
    rtcMinPort: 40000,
    rtcMaxPort: 49999,
    logLevel: 'warn'
  });

  worker.on('died', () => {
    logger.error('mediasoup worker died, exiting for restart');
    process.exit(1);
  });

  const router = await worker.createRouter({ mediaCodecs });
  logger.info({ rtpCapabilities: router.rtpCapabilities }, 'media router initialized');
  logger.info('SFU ready with simulcast-capable routing');
}

boot().catch((error) => {
  logger.error({ error }, 'failed to boot media service');
  process.exit(1);
});
