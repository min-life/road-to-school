import { Injectable } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { OnGatewayInit } from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import { AuthGuard } from '../../auth/auth.guard.js';
import type { IotScanResponseDto } from '../dto/iot-response.dto.js';

@Injectable()
@WebSocketGateway({
  namespace: '/iot', transports: ['websocket'], maxHttpBufferSize: 16384,
  cors: { origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] },
})
export class IotScansGateway implements OnGatewayInit<Namespace> {
  @WebSocketServer() private server: Namespace;

  constructor(private readonly auth: AuthGuard) {}

  afterInit(server: Namespace) {
    server.use((socket, next) => {
      void this.authorize(socket).then(() => next(), () => next(new Error('Unauthorized')));
    });
  }

  private async authorize(socket: Socket): Promise<void> {
    const token: unknown = socket.handshake.auth?.token;
    if (typeof token !== 'string' || token.length > 8192) throw new Error('Unauthorized');
    const request: { headers: { authorization: string }; user?: { role: string } } = {
      headers: { authorization: `Bearer ${token}` },
    };
    if (!await this.auth.canActivate(new ExecutionContextHost([request]))
      || request.user?.role !== 'SYSTEM_ADMIN') throw new Error('Unauthorized');
  }

  async publish(scan: IotScanResponseDto): Promise<void> {
    if (!this.server) return;
    // Re-check the live Session, token expiry and account role before each delivery.
    // Notification failure must never turn a persisted scan into a failed request.
    await Promise.allSettled([...this.server.sockets.values()].map(async (socket) => {
      try {
        await this.authorize(socket);
        socket.emit('new_rfid_scan', scan);
      } catch {
        socket.disconnect(true);
      }
    }));
  }
}
