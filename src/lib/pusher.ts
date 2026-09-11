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

export function isPusherConfigured(): boolean {
  return getPusherServer() !== null;
}

export type PusherResult = 
  | { success: true } 
  | { success: false; error: unknown };

export async function triggerPusherEvent(
  channel: string, 
  event: string, 
  data: unknown
): Promise<PusherResult> {
  const pusher = getPusherServer();
  if (!pusher) {
    console.warn(`[Pusher] Skipped event "${event}" on channel "${channel}" — Pusher not configured`);
    return { success: false, error: new Error('Pusher not configured') };
  }

  try {
    console.log(`[Pusher] Triggering event "${event}" on channel "${channel}"`);
    await pusher.trigger(channel, event, data);
    console.log(`[Pusher] Successfully delivered event "${event}" on channel "${channel}"`);
    return { success: true };
  } catch (err) {
    console.error(`[Pusher] Failed to trigger event "${event}" on channel "${channel}":`, err);
    return { success: false, error: err };
  }
}

export function authorizeChannel(socketId: string, channelName: string) {
  const pusher = getPusherServer();
  if (!pusher) {
    throw new Error('Pusher not configured');
  }
  return pusher.authorizeChannel(socketId, channelName);
}

