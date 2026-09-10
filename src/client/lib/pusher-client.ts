import PusherClient from 'pusher-js';

let client: PusherClient | null = null;

export function getPusherClient(): PusherClient | null {
  if (client) return client;

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap2';

  if (!key) return null;

  try {
    client = new PusherClient(key, {
      cluster,
      forceTLS: true,
    });
    return client;
  } catch (err) {
    console.warn('[PusherClient] Init error:', err);
    return null;
  }
}

export function subscribeChannel<T = unknown>(channelName: string, eventName: string, callback: (data: T) => void) {
  const pusher = getPusherClient();
  if (!pusher) return () => {};

  try {
    const channel = pusher.subscribe(channelName);
    channel.bind(eventName, callback);

    return () => {
      channel.unbind(eventName, callback);
      pusher.unsubscribe(channelName);
    };
  } catch (err) {
    console.warn(`[PusherClient] Sub error on ${channelName}:`, err);
    return () => {};
  }
}
