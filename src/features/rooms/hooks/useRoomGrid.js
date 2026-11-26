import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../../../lib/supabaseClient';
import { roomsApi } from '../api/roomsApi';

/**
 * Live room grid hook with:
 * - Single initial grid + /me fetch per stay
 * - Supabase Realtime subscription on public.rooms filtered by stay_id (patches single tile)
 * - Automatic polling fallback (9s) + full refresh on reconnect & tab visibility
 */
export function useRoomGrid(stayId) {
  const [grid, setGrid] = useState(null); // { stay, roomTypes, rooms, myRoomId }
  const [me, setMe] = useState(null); // { stay, profile, myRoom, roommates, eligibilityByTypeId }
  const [loading, setLoading] = useState(Boolean(stayId));
  const [error, setError] = useState(null);
  const [connectionState, setConnectionState] = useState('connecting'); // 'live' | 'reconnecting' | 'polling'

  const mountedRef = useRef(true);
  const wasDisconnectedRef = useRef(false);

  const loadAll = useCallback(async ({ silent = false } = {}) => {
    if (!stayId) {
      setGrid(null);
      setMe(null);
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);
    try {
      const [gridRes, meRes] = await Promise.all([
        roomsApi.getGrid(stayId),
        roomsApi.getMe(stayId),
      ]);
      if (!mountedRef.current) return;
      setGrid(gridRes);
      setMe(meRes);
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err.message || 'Failed to load room layout.');
    } finally {
      if (mountedRef.current && !silent) setLoading(false);
    }
  }, [stayId]);

  const refreshMe = useCallback(async () => {
    if (!stayId) return;
    try {
      const meRes = await roomsApi.getMe(stayId);
      if (!mountedRef.current) return;
      setMe(meRes);
      const myRoomId = meRes?.myRoom?.id || null;
      setGrid((prev) =>
        prev
          ? {
              ...prev,
              myRoomId,
              rooms: prev.rooms.map((r) => ({ ...r, is_mine: r.id === myRoomId })),
            }
          : prev
      );
    } catch {
      // Ignore transient refresh errors
    }
  }, [stayId]);

  useEffect(() => {
    mountedRef.current = true;
    const t = setTimeout(() => {
      if (mountedRef.current) loadAll();
    }, 0);
    return () => {
      clearTimeout(t);
      mountedRef.current = false;
    };
  }, [loadAll]);

  // Patch a single room tile in local state on Realtime UPDATE
  const patchRoomFromRealtime = useCallback((updatedRow) => {
    if (!updatedRow?.id) return;
    setGrid((prev) => {
      if (!prev) return prev;
      const typeMap = new Map((prev.roomTypes || []).map((t) => [t.id, t]));
      const rt = typeMap.get(updatedRow.room_type_id);
      let found = false;
      const nextRooms = prev.rooms.map((r) => {
        if (r.id !== updatedRow.id) return r;
        found = true;
        return {
          ...r,
          room_no: updatedRow.room_no ?? r.room_no,
          floor: updatedRow.floor !== undefined ? updatedRow.floor : r.floor,
          capacity: updatedRow.capacity ?? r.capacity,
          room_type_id: updatedRow.room_type_id ?? r.room_type_id,
          type_key: rt?.key ?? r.type_key,
          type_label: rt?.label ?? r.type_label,
          color_hex: rt?.color_hex ?? r.color_hex,
          allowed_roles: rt?.allowed_roles ?? r.allowed_roles,
          allowed_genders: rt?.allowed_genders ?? r.allowed_genders,
          occupant_count: updatedRow.occupant_count ?? r.occupant_count,
          is_locked: updatedRow.is_locked ?? r.is_locked,
          version: updatedRow.version ?? r.version,
        };
      });
      if (!found) return prev;
      return { ...prev, rooms: nextRooms };
    });

    // If my selected room changed version, refresh my roommates
    setMe((prevMe) => {
      if (prevMe?.myRoom?.id === updatedRow.id && prevMe.myRoom.version !== updatedRow.version) {
        refreshMe();
      }
      return prevMe;
    });
  }, [refreshMe]);

  // Supabase Realtime subscription + polling fallback + visibility/online resync
  useEffect(() => {
    if (!stayId) return;

    let pollTimer = null;
    let channel = null;

    const startPolling = () => {
      if (pollTimer) return;
      pollTimer = setInterval(() => {
        if (document.visibilityState === 'visible') {
          loadAll({ silent: true });
        }
      }, 9000);
    };

    const stopPolling = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    if (isSupabaseConfigured && supabase) {
      channel = supabase
        .channel(`rooms-stay-${stayId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'rooms',
            filter: `stay_id=eq.${stayId}`,
          },
          (payload) => {
            if (payload?.new) {
              patchRoomFromRealtime(payload.new);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'rooms',
            filter: `stay_id=eq.${stayId}`,
          },
          () => loadAll({ silent: true })
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'rooms',
            filter: `stay_id=eq.${stayId}`,
          },
          () => loadAll({ silent: true })
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'stays',
            filter: `id=eq.${stayId}`,
          },
          () => loadAll({ silent: true })
        )
        .subscribe((status) => {
          if (!mountedRef.current) return;
          if (status === 'SUBSCRIBED') {
            setConnectionState('live');
            stopPolling();
            if (wasDisconnectedRef.current) {
              wasDisconnectedRef.current = false;
              loadAll({ silent: true });
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            wasDisconnectedRef.current = true;
            setConnectionState('reconnecting');
            startPolling();
          }
        });
    } else {
      pollTimer = setInterval(() => {
        if (document.visibilityState === 'visible') {
          loadAll({ silent: true });
        }
      }, 9000);
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadAll({ silent: true });
      }
    };
    const handleOnline = () => {
      loadAll({ silent: true });
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [stayId, loadAll, patchRoomFromRealtime]);

  return {
    grid,
    setGrid,
    me,
    loading,
    error,
    connectionState,
    refresh: loadAll,
    refreshMe,
  };
}
