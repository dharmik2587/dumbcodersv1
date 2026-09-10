import Pusher from 'pusher';

let pusherInstance: Pusher | null = null;

export function getPusherServer(): Pusher | null {
  if (pusherInstance) return pusherInstance;

  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER || 'ap2';

  if (!appId || !key || !secret) {
    return null;
  }

  pusherInstance = new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  });

  return pusherInstance;
}

export async function triggerPusherEvent(channel: string, event: string, data: unknown) {
  const pusher = getPusherServer();
  if (!pusher) {
    console.warn(`[Pusher] Skipped event "${event}" on "${channel}" — Pusher not configured`);
    return null;
  }

  try {
    const res = await pusher.trigger(channel, event, data);
    return res;
  } catch (err) {
    console.error(`[Pusher] Failed to trigger event "${event}" on "${channel}":`, err);
    return null;
  }
}
