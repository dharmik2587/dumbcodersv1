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
        const partnerUserId = payload.fromUserId === currentUserId ? payload.toUserId : payload.fromUserId;
        const mappedStatus =
          payload.action === 'created' || payload.action === 'sent'
            ? 'pending'
            : payload.action === 'accepted'
              ? 'accepted'
              : payload.action === 'rejected'
                ? 'rejected'
                : 'withdrawn';

        // 1. Incremental cache patching for partner search results
        queryClient.setQueriesData({ queryKey: ['partners'] }, (old: any) => {
          if (!old) return old;
          // Handle paginated partner search response { data: PartnerItem[], meta: ... }
          if (Array.isArray(old.data)) {
            return {
              ...old,
              data: old.data.map((p: any) =>
                p.id === partnerUserId
                  ? {
                      ...p,
                      requestStatus: mappedStatus,
                      requestDirection: payload.fromUserId === currentUserId ? 'sent' : 'received',
                      requestId: payload.requestId,
                    }
                  : p
              ),
            };
          }
          // Handle direct array of partners
          if (Array.isArray(old)) {
            return old.map((p: any) =>
              p.id === partnerUserId
                ? {
                    ...p,
                    requestStatus: mappedStatus,
                    requestDirection: payload.fromUserId === currentUserId ? 'sent' : 'received',
                    requestId: payload.requestId,
                  }
                : p
            );
          }
          return old;
        });

        // 2. Incremental cache patching for requests inbox query cache
        queryClient.setQueriesData({ queryKey: ['requests'] }, (old: any) => {
          if (!Array.isArray(old)) return old;

          const exists = old.some((item: any) => {
            const req = item.request ?? item;
            return req.id === payload.requestId;
          });

          if (exists) {
            return old.map((item: any) => {
              const req = item.request ?? item;
              if (req.id === payload.requestId) {
                if (item.request) {
                  return {
                    ...item,
                    request: {
                      ...item.request,
                      status: mappedStatus,
                    },
                  };
                }
                return {
                  ...item,
                  status: mappedStatus,
                };
              }
              return item;
            });
          }

          // If it's a new inbound request that we don't have yet, prepend skeleton request item
          if (payload.action === 'created' && payload.toUserId === currentUserId) {
            const newRequestItem = {
              request: {
                id: payload.requestId,
                status: 'pending',
                message: null,
                fromUserId: payload.fromUserId,
                toUserId: payload.toUserId,
                teamId: payload.teamId ?? null,
                roleOffered: payload.roleOffered ?? null,
                createdAt: payload.createdAt ?? new Date().toISOString(),
              },
              from: {
                username: 'collaborator',
                fullName: 'Collaboration Partner',
              },
              team: null,
            };
            return [newRequestItem, ...old];
          }

          return old;
        });

        // 3. Trigger targeted invalidations for authoritative DB consistency
        void queryClient.invalidateQueries({ queryKey: ['requests'] });
        void queryClient.invalidateQueries({ queryKey: ['partners'] });
        void queryClient.invalidateQueries({ queryKey: ['notifications'] });

        if (payload.action === 'accepted') {
          void queryClient.invalidateQueries({ queryKey: ['conversations'] });
          void queryClient.invalidateQueries({ queryKey: ['teams'] });
          void useApiStore.getState().loadTeams();
        }

        // 4. Synchronize Zustand apiStore
        void useApiStore.getState().loadRequests();

        // 5. Notify user with interactive toast feedback
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
