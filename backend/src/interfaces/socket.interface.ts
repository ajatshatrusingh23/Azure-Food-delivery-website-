/**
 * Abstraction over Socket.IO server to enable dependency injection
 * and easier testing without coupling to Socket.IO internals.
 */
export interface ISocketService {
  emit(room: string, event: string, data: unknown): void;
  joinRoom(socketId: string, room: string): void;
  leaveRoom(socketId: string, room: string): void;
  broadcastToAll(event: string, data: unknown): void;
}
