import { NextRequest, NextResponse } from 'next/server';
import { getRedis, hasRedis } from '@/lib/redis';
import { publishBeamsNotification } from '@/lib/pusher-beams';
import { requireUserId } from '@/lib/auth/server';
import { enforceRateLimit } from '@/lib/ratelimit';
import { failure, success } from '@/lib/http';

export const runtime = 'nodejs';

export async function GET() {
  const redisConnected = hasRedis();
  let redisPing = 'untested';

  if (redisConnected) {
    try {
      const redis = getRedis();
      if (redis) {
        await redis.set('hackmate:health:check', Date.now(), { ex: 60 });
        const val = await redis.get('hackmate:health:check');
        redisPing = val ? 'ok' : 'failed';
      }
    } catch (e: unknown) {
      redisPing = `error: ${e instanceof Error ? e.message : 'unknown'}`;
    }
  }

  const instanceId = process.env.PUSHER_BEAMS_INSTANCE_ID || process.env.NEXT_PUBLIC_PUSHER_BEAMS_INSTANCE_ID;

  return NextResponse.json({
    status: 'ok',
    services: {
      redis: {
        configured: redisConnected,
        ping: redisPing,
      },
      pusherBeams: {
        configured: Boolean(instanceId && process.env.PUSHER_BEAMS_SECRET_KEY),
        instanceId: instanceId ? `${instanceId.slice(0, 8)}...` : undefined,
      },
    },
  });
}

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return failure('UNAUTHORIZED', 'Sign in to send push notifications.', 401);
  }

  const rl = await enforceRateLimit(`push:${userId}`, 10, 60);
  if (!rl.success && rl.response) return rl.response;

  try {
    const body = await req.json().catch(() => ({}));
    const { interests = ['hello'], title = 'Hello', message = 'Hello from HackMate!' } = body;

    const result = await publishBeamsNotification(interests, {
      title,
      body: message,
    });

    return success({ result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to send notification';
    return failure('PUSH_FAILED', msg, 500);
  }
}
