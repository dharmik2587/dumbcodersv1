import { NextResponse } from 'next/server';
import { getOptionalUser } from '@/lib/auth/server';
import { authorizeChannel } from '@/lib/pusher';

export async function POST(request: Request) {
  const user = await getOptionalUser();
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  let socketId: string | null = null;
  let channelName: string | null = null;

  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => ({}));
    socketId = body.socket_id ?? null;
    channelName = body.channel_name ?? null;
  } else {
    try {
      const formData = await request.formData();
      socketId = formData.get('socket_id')?.toString() ?? null;
      channelName = formData.get('channel_name')?.toString() ?? null;
    } catch {
      const text = await request.text();
      const params = new URLSearchParams(text);
      socketId = params.get('socket_id');
      channelName = params.get('channel_name');
    }
  }

  if (!socketId || !channelName) {
    return new NextResponse('Missing socket_id or channel_name', { status: 400 });
  }

  // Authorization check: User can ONLY subscribe to their own private channel: private-user-${user.id}
  const expectedUserChannel = `private-user-${user.id}`;
  if (channelName !== expectedUserChannel) {
    console.warn(`[Pusher Auth] Denied access for user ${user.id} to channel ${channelName}`);
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const authResponse = authorizeChannel(socketId, channelName);
    return NextResponse.json(authResponse);
  } catch (err) {
    console.error('[Pusher Auth] Authorization failed:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
