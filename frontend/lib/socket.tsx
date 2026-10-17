'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { api } from './api';
import { useAuth } from './auth';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:5001';

interface SocketState {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketState>({ socket: null, connected: false });

/**
 * One authenticated Socket.IO connection per signed-in user, shared by every page. The
 * handshake token is fetched fresh on every (re)connect because it is valid for 60 seconds.
 */
export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<SocketState>({ socket: null, connected: false });

  useEffect(() => {
    if (!user) return;
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: (cb) => {
        api
          .get<{ token: string }>('/auth/socket-token')
          .then(({ token }) => cb({ token }))
          .catch(() => cb({}));
      },
    });
    socket.on('ready', () => setState({ socket, connected: true }));
    socket.on('disconnect', () => setState({ socket, connected: false }));
    setState({ socket, connected: false });
    return () => {
      socket.disconnect();
      setState({ socket: null, connected: false });
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return <SocketContext.Provider value={state}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);

/** Subscribe to a server event while the component is mounted. */
export function useSocketEvent<T>(event: string, handler: (payload: T) => void) {
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket) return;
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [socket, event, handler]);
}
