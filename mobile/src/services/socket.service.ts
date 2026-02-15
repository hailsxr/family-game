import { io, Socket } from 'socket.io-client';
import { API_URL } from '../config/api';

class SocketService {
  private socket: Socket | null = null;

  connect(): Socket {
    if (!this.socket) {
      this.socket = io(API_URL, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
      });
    }
    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, data?: unknown): void {
    this.socket?.emit(event, data);
  }

  on(event: string, cb: (...args: unknown[]) => void): void {
    this.socket?.on(event, cb);
  }

  off(event: string, cb?: (...args: unknown[]) => void): void {
    if (cb) {
      this.socket?.off(event, cb);
    } else {
      this.socket?.off(event);
    }
  }

  get id(): string | undefined {
    return this.socket?.id;
  }

  get connected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();
