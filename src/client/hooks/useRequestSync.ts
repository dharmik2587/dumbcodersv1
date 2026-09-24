'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { subscribeChannel } from '@/client/lib/pusher-client';
import { useApiStore } from '@/client/store/apiStore';

export interface TeamRequestPusherPayload {
  action: 'created' | 'sent' | 'accepted' | 'rejected' | 'withdrawn';
  requestId: string;
  fromUserId: string;
  toUserId: string;
  status: string;
  roleOffered?: string | null;
  teamId?: string | null;
  conversationId?: string;
  createdAt?: string;
}

/**
 * Hook to synchronize request state in real-time across the client application.
 * Listens to private Pusher channel for direct request lifecycle events and
 * automatically refreshes TanStack Query cache and Zustand apiStore.
 */
export function useRequestSync(currentUserId?: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!currentUserId) return;

    const channelName = `private-user-${currentUserId}`;
    const unsubscribe = subscribeChannel<TeamRequestPusherPayload>(
      channelName,
      'team-request',
      (payload) => {
        // Invalidate queries so TanStack cache has authoritative state
        void queryClient.invalidateQueries({ queryKey: ['requests'] });
        void queryClient.invalidateQueries({ queryKey: ['partners'] });
        void queryClient.invalidateQueries({ queryKey: ['notifications'] });

        // Synchronize Zustand apiStore
        void useApiStore.getState().loadRequests();

        // Notify user with feedback
        if (payload.action === 'created' && payload.toUserId === currentUserId) {
          toast.info('New collaboration request received!', {
            description: 'Check your requests inbox to respond.',
            action: {
              label: 'View',
              onClick: () => {
                if (typeof window !== 'undefined') window.location.href = '/requests';
              },
            },
          });
        } else if (payload.action === 'accepted' && payload.fromUserId === currentUserId) {
          toast.success('Your collaboration request was accepted!', {
            action: payload.conversationId
              ? {
                  label: 'Chat',
                  onClick: () => {
                    if (typeof window !== 'undefined') {
                      window.location.href = `/messages?conversationId=${payload.conversationId}`;
                    }
                  },
                }
              : undefined,
          });
        } else if (payload.action === 'rejected' && payload.fromUserId === currentUserId) {
          toast.info('A collaboration request was declined.');
        } else if (payload.action === 'withdrawn' && payload.toUserId === currentUserId) {
          toast.info('A collaboration request was withdrawn.');
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [currentUserId, queryClient]);
}
