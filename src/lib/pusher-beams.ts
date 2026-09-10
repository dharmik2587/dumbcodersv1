export interface BeamsNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  deepLink?: string;
  data?: Record<string, unknown>;
}

export async function publishBeamsNotification(
  interests: string[],
  notification: BeamsNotificationPayload,
) {
  const instanceId =
    process.env.PUSHER_BEAMS_INSTANCE_ID ||
    process.env.NEXT_PUBLIC_PUSHER_BEAMS_INSTANCE_ID;
  const secretKey = process.env.PUSHER_BEAMS_SECRET_KEY;

  if (!instanceId || !secretKey) {
    console.warn('[PusherBeams] publish skipped: PUSHER_BEAMS_INSTANCE_ID or PUSHER_BEAMS_SECRET_KEY not set.');
    return null;
  }

  const url = `https://${instanceId}.pushnotifications.pusher.com/publish_api/v1/instances/${instanceId}/publishes`;

  const payload: Record<string, unknown> = {
    interests,
    web: {
      notification: {
        title: notification.title,
        body: notification.body,
        deep_link: notification.deepLink || undefined,
        data: notification.data || undefined,
      },
    },
  };

  if (notification.icon && notification.icon.startsWith('http')) {
    (payload.web as Record<string, unknown>).notification = {
      ...((payload.web as Record<string, unknown>).notification as Record<string, unknown>),
      icon: notification.icon,
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secretKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pusher Beams Publish Failed (${response.status}): ${errorText}`);
  }

  return response.json();
}
