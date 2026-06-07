import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessagingService } from './messaging.service';

type AuthenticatedSocket = Socket & {
  data: Socket['data'] & {
    user?: {
      sub: number;
      email?: string;
      role?: string;
    };
  };
};

type JoinConversationPayload = {
  conversationId: number;
};

type SendMessagePayload = {
  conversationId: number;
  body: string;
};

// Gateway Socket.IO de la messagerie.
// Les sockets sont authentifiees via JWT, rejoignent automatiquement
// les rooms des conversations visibles, puis propagent les nouveaux messages.
@Injectable()
@WebSocketGateway({
  namespace: '/messaging',
  cors: {
    origin: process.env.FRONTEND_URL ?? true,
    credentials: true,
  },
})
export class MessagingGateway
  implements OnGatewayConnection<AuthenticatedSocket>, OnGatewayDisconnect<AuthenticatedSocket>
{
  private readonly logger = new Logger(MessagingGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly messagingService: MessagingService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        throw new UnauthorizedException('Token manquant');
      }

      const payload = await this.jwtService.verifyAsync<{
        sub: number;
        email?: string;
        role?: string;
      }>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      client.data.user = payload;

      const conversations = await this.messagingService.listMyConversations(
        Number(payload.sub),
      );

      await Promise.all(
        conversations.map((conversation) =>
          client.join(this.getConversationRoom(conversation.id)),
        ),
      );

      client.emit('messaging:ready', {
        conversations,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'authentification impossible';
      this.logger.warn(`Connexion socket refusee: ${message}`);
      client.emit('messaging:error', { message: 'Authentification refusee' });
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    const userId = client.data.user?.sub;
    if (userId) {
      this.logger.debug(`Socket deconnecte pour user ${userId}`);
    }
  }

  @SubscribeMessage('messaging:listConversations')
  async handleListConversations(@ConnectedSocket() client: AuthenticatedSocket) {
    const userId = this.getAuthenticatedUserId(client);
    const conversations = await this.messagingService.listMyConversations(userId);

    return {
      event: 'messaging:conversations',
      data: conversations,
    };
  }

  @SubscribeMessage('messaging:getMessages')
  async handleGetMessages(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: JoinConversationPayload,
  ) {
    const userId = this.getAuthenticatedUserId(client);
    const conversation = await this.messagingService.getConversationMessages(
      userId,
      Number(payload.conversationId),
    );

    await client.join(this.getConversationRoom(conversation.id));

    return {
      event: 'messaging:messages',
      data: conversation,
    };
  }

  @SubscribeMessage('messaging:markRead')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: JoinConversationPayload,
  ) {
    const userId = this.getAuthenticatedUserId(client);
    const unreadCount = await this.messagingService.markConversationAsRead(
      userId,
      Number(payload.conversationId),
    );

    return {
      event: 'messaging:unreadCount',
      data: unreadCount,
    };
  }

  @SubscribeMessage('messaging:joinConversation')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: JoinConversationPayload,
  ) {
    const userId = this.getAuthenticatedUserId(client);
    const conversation = await this.messagingService.getConversationMessages(
      userId,
      Number(payload.conversationId),
    );

    await client.join(this.getConversationRoom(conversation.id));

    return {
      event: 'messaging:joinedConversation',
      data: {
        conversationId: conversation.id,
      },
    };
  }

  @SubscribeMessage('messaging:leaveConversation')
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: JoinConversationPayload,
  ) {
    const userId = this.getAuthenticatedUserId(client);
    await this.messagingService.getConversationMessages(
      userId,
      Number(payload.conversationId),
    );

    await client.leave(this.getConversationRoom(Number(payload.conversationId)));

    return {
      event: 'messaging:leftConversation',
      data: {
        conversationId: Number(payload.conversationId),
      },
    };
  }

  @SubscribeMessage('messaging:sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: SendMessagePayload,
  ) {
    const userId = this.getAuthenticatedUserId(client);
    const message = await this.messagingService.sendMessage(
      userId,
      Number(payload.conversationId),
      { body: payload.body } satisfies CreateMessageDto,
    );

    const room = this.getConversationRoom(Number(payload.conversationId));
    this.server.to(room).emit('messaging:newMessage', {
      conversationId: Number(payload.conversationId),
      message,
    });

    return {
      event: 'messaging:messageSent',
      data: {
        conversationId: Number(payload.conversationId),
        message,
      },
    };
  }

  private extractToken(client: AuthenticatedSocket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim().length > 0) {
      return authToken;
    }

    const authorizationHeader = client.handshake.headers.authorization;
    if (
      typeof authorizationHeader === 'string' &&
      authorizationHeader.startsWith('Bearer ')
    ) {
      return authorizationHeader.slice('Bearer '.length).trim();
    }

    return null;
  }

  private getAuthenticatedUserId(client: AuthenticatedSocket): number {
    const userId = client.data.user?.sub;
    if (!userId) {
      throw new ForbiddenException('Socket non authentifiee');
    }

    return Number(userId);
  }

  private getConversationRoom(conversationId: number): string {
    return `conversation:${conversationId}`;
  }
}
