import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Meal } from '../meals/meal.entity';
import { Utilisateur } from '../users/users.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageConversationMemberRole } from './message-conversation-member.entity';
import { MessageConversationMember } from './message-conversation-member.entity';
import {
  MessageConversation,
  MessageConversationType,
} from './message-conversation.entity';
import { MessageEntry } from './message-entry.entity';

type ConversationUserSummary = {
  userId: number;
  pseudo: string | null;
  firstName: string;
  lastName: string;
  profilePhotoUrl: string | null;
};

type ConversationMemberSummary = ConversationUserSummary & {
  role: MessageConversationMemberRole;
  joinedAt: Date;
};

type MessageSummary = {
  id: number;
  body: string;
  createdAt: Date;
  sender: ConversationUserSummary;
};

type ConversationSummary = {
  id: number;
  type: MessageConversationType;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  meal: {
    mealId: number;
    title: string | null;
    dateTime: Date;
    hostUserId: number;
  } | null;
  members: ConversationMemberSummary[];
  latestMessage: MessageSummary | null;
};

type ConversationDetail = ConversationSummary & {
  messages: MessageSummary[];
};

// Service coeur de la messagerie.
// Il gere les conversations visibles par un utilisateur et les outils
// d'orchestration relies au futur parcours de reservation.
@Injectable()
export class MessagingService {
  constructor(
    @InjectRepository(MessageConversation)
    private readonly conversationsRepository: Repository<MessageConversation>,
    @InjectRepository(MessageConversationMember)
    private readonly membersRepository: Repository<MessageConversationMember>,
    @InjectRepository(MessageEntry)
    private readonly messagesRepository: Repository<MessageEntry>,
    @InjectRepository(Meal)
    private readonly mealsRepository: Repository<Meal>,
    @InjectRepository(Utilisateur)
    private readonly usersRepository: Repository<Utilisateur>,
  ) {}

  async listMyConversations(userId: number): Promise<ConversationSummary[]> {
    const memberships = await this.membersRepository.find({
      where: { user: { id: userId } },
      relations: [
        'conversation',
        'conversation.meal',
        'conversation.meal.host',
        'conversation.members',
        'conversation.members.user',
      ],
    });

    const conversations = memberships
      .map((membership) => membership.conversation)
      .filter(
        (conversation, index, allConversations) =>
          allConversations.findIndex(
            (currentConversation) => currentConversation.id === conversation.id,
          ) === index,
      )
      .sort(
        (firstConversation, secondConversation) =>
          secondConversation.updatedAt.getTime() -
          firstConversation.updatedAt.getTime(),
      );

    const latestMessagesByConversationId =
      await this.findLatestMessagesByConversationIds(
        conversations.map((conversation) => conversation.id),
      );

    return conversations.map((conversation) =>
      this.toConversationSummary(
        conversation,
        latestMessagesByConversationId.get(conversation.id) ?? null,
      ),
    );
  }

  async getConversationMessages(
    userId: number,
    conversationId: number,
  ): Promise<ConversationDetail> {
    const conversation = await this.findConversationForMember(userId, conversationId);

    const messages = await this.messagesRepository.find({
      where: { conversation: { id: conversation.id } },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
    });

    const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null;

    return {
      ...this.toConversationSummary(conversation, latestMessage),
      messages: messages.map((message) => this.toMessageSummary(message)),
    };
  }

  async sendMessage(
    userId: number,
    conversationId: number,
    createMessageDto: CreateMessageDto,
  ): Promise<MessageSummary> {
    const conversation = await this.findConversationForMember(userId, conversationId);
    const sender = await this.usersRepository.findOne({ where: { id: userId } });

    if (!sender) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const normalizedBody = createMessageDto.body.trim();
    if (!normalizedBody) {
      throw new BadRequestException('Le message ne peut pas etre vide');
    }

    const message = this.messagesRepository.create({
      conversation,
      sender,
      body: normalizedBody,
    });

    const savedMessage = await this.messagesRepository.save(message);
    conversation.updatedAt = new Date();
    await this.conversationsRepository.save(conversation);

    return this.toMessageSummary(savedMessage);
  }

  async openReservationDirectConversation(
    mealId: number,
    guestUserId: number,
  ): Promise<ConversationSummary> {
    const meal = await this.findMealOrFail(mealId);
    const guest = await this.findUserOrFail(guestUserId);

    if (meal.host.id === guest.id) {
      throw new BadRequestException(
        'Le host ne peut pas ouvrir une conversation directe avec lui-meme',
      );
    }

    const existingConversation = await this.findPairConversation(
      meal.id,
      MessageConversationType.BOOKING_DIRECT,
      [meal.host.id, guest.id],
    );

    const conversation =
      existingConversation ??
      (await this.createConversationWithMembers({
        type: MessageConversationType.BOOKING_DIRECT,
        meal,
        title: meal.title ? `Reservation - ${meal.title}` : 'Reservation',
        members: [
          { user: meal.host, role: MessageConversationMemberRole.HOST },
          { user: guest, role: MessageConversationMemberRole.GUEST },
        ],
      }));

    return this.toConversationSummary(conversation, null);
  }

  async syncAcceptedMealConversations(
    mealId: number,
    participantUserIds: number[],
  ): Promise<{
    mealGroupConversationId: number | null;
    pairConversationIds: number[];
  }> {
    const meal = await this.findMealOrFail(mealId);
    const uniqueParticipantIds = Array.from(
      new Set(
        participantUserIds
          .map((participantUserId) => Number(participantUserId))
          .filter((participantUserId) => Number.isInteger(participantUserId) && participantUserId > 0),
      ),
    ).filter((participantUserId) => participantUserId !== meal.host.id);

    const participantUsers =
      uniqueParticipantIds.length > 0
        ? await this.usersRepository.find({
            where: { id: In(uniqueParticipantIds) },
          })
        : [];

    if (participantUsers.length !== uniqueParticipantIds.length) {
      throw new NotFoundException(
        'Au moins un participant est introuvable pour la synchronisation',
      );
    }

    const acceptedUsers = [meal.host, ...participantUsers];

    const mealGroupConversation =
      acceptedUsers.length >= 2
        ? await this.syncMealGroupConversation(meal, acceptedUsers)
        : null;

    const pairConversationIds = await this.syncPairConversations(meal, acceptedUsers);

    return {
      mealGroupConversationId: mealGroupConversation?.id ?? null,
      pairConversationIds,
    };
  }

  private async syncMealGroupConversation(
    meal: Meal,
    acceptedUsers: Utilisateur[],
  ): Promise<MessageConversation> {
    const existingConversation = await this.conversationsRepository.findOne({
      where: {
        meal: { id: meal.id },
        type: MessageConversationType.MEAL_GROUP,
      },
      relations: ['members', 'members.user', 'meal', 'meal.host'],
    });

    if (!existingConversation) {
      return this.createConversationWithMembers({
        type: MessageConversationType.MEAL_GROUP,
        meal,
        title: meal.title ? `Groupe - ${meal.title}` : 'Groupe du repas',
        members: acceptedUsers.map((user) => ({
          user,
          role:
            user.id === meal.host.id
              ? MessageConversationMemberRole.HOST
              : MessageConversationMemberRole.PARTICIPANT,
        })),
      });
    }

    await this.syncConversationMembers(
      existingConversation,
      acceptedUsers.map((user) => ({
        user,
        role:
          user.id === meal.host.id
            ? MessageConversationMemberRole.HOST
            : MessageConversationMemberRole.PARTICIPANT,
      })),
    );

    existingConversation.updatedAt = new Date();
    return this.conversationsRepository.save(existingConversation);
  }

  private async syncPairConversations(
    meal: Meal,
    acceptedUsers: Utilisateur[],
  ): Promise<number[]> {
    const requiredPairKeys = new Set<string>();
    const pairConversationIds: number[] = [];

    for (let firstIndex = 0; firstIndex < acceptedUsers.length; firstIndex += 1) {
      for (
        let secondIndex = firstIndex + 1;
        secondIndex < acceptedUsers.length;
        secondIndex += 1
      ) {
        const firstUser = acceptedUsers[firstIndex];
        const secondUser = acceptedUsers[secondIndex];
        const pairUserIds = [firstUser.id, secondUser.id].sort((a, b) => a - b);
        requiredPairKeys.add(pairUserIds.join(':'));

        const existingConversation = await this.findPairConversation(
          meal.id,
          MessageConversationType.MEAL_DIRECT,
          pairUserIds,
        );

        if (existingConversation) {
          pairConversationIds.push(existingConversation.id);
          continue;
        }

        const createdConversation = await this.createConversationWithMembers({
          type: MessageConversationType.MEAL_DIRECT,
          meal,
          title: meal.title ? `Participants - ${meal.title}` : 'Conversation participants',
          members: pairUserIds.map((userId) => {
            const user = acceptedUsers.find(
              (acceptedUser) => acceptedUser.id === userId,
            );

            if (!user) {
              throw new NotFoundException('Participant introuvable');
            }

            return {
              user,
              role:
                user.id === meal.host.id
                  ? MessageConversationMemberRole.HOST
                  : MessageConversationMemberRole.PARTICIPANT,
            };
          }),
        });

        pairConversationIds.push(createdConversation.id);
      }
    }

    const existingPairConversations = await this.conversationsRepository.find({
      where: {
        meal: { id: meal.id },
        type: MessageConversationType.MEAL_DIRECT,
      },
      relations: ['members', 'members.user'],
    });

    const obsoleteConversations = existingPairConversations.filter((conversation) => {
      const key = conversation.members
        .map((member) => member.user.id)
        .sort((firstUserId, secondUserId) => firstUserId - secondUserId)
        .join(':');

      return !requiredPairKeys.has(key);
    });

    if (obsoleteConversations.length > 0) {
      await this.conversationsRepository.remove(obsoleteConversations);
    }

    return pairConversationIds;
  }

  private async syncConversationMembers(
    conversation: MessageConversation,
    nextMembers: Array<{
      user: Utilisateur;
      role: MessageConversationMemberRole;
    }>,
  ): Promise<void> {
    const currentMembersByUserId = new Map(
      conversation.members.map((member) => [member.user.id, member] as const),
    );
    const nextMemberUserIds = new Set(nextMembers.map((nextMember) => nextMember.user.id));

    for (const nextMember of nextMembers) {
      const existingMember = currentMembersByUserId.get(nextMember.user.id);

      if (!existingMember) {
        await this.membersRepository.save(
          this.membersRepository.create({
            conversation,
            user: nextMember.user,
            role: nextMember.role,
          }),
        );
        continue;
      }

      if (existingMember.role !== nextMember.role) {
        existingMember.role = nextMember.role;
        await this.membersRepository.save(existingMember);
      }
    }

    const membersToRemove = conversation.members.filter(
      (member) => !nextMemberUserIds.has(member.user.id),
    );

    if (membersToRemove.length > 0) {
      await this.membersRepository.remove(membersToRemove);
    }
  }

  private async createConversationWithMembers(params: {
    type: MessageConversationType;
    meal: Meal;
    title: string | null;
    members: Array<{
      user: Utilisateur;
      role: MessageConversationMemberRole;
    }>;
  }): Promise<MessageConversation> {
    const conversation = await this.conversationsRepository.save(
      this.conversationsRepository.create({
        type: params.type,
        meal: params.meal,
        title: params.title,
      }),
    );

    await this.membersRepository.save(
      params.members.map((member) =>
        this.membersRepository.create({
          conversation,
          user: member.user,
          role: member.role,
        }),
      ),
    );

    return this.conversationsRepository.findOneOrFail({
      where: { id: conversation.id },
      relations: ['meal', 'meal.host', 'members', 'members.user'],
    });
  }

  private async findPairConversation(
    mealId: number,
    type: MessageConversationType,
    userIds: number[],
  ): Promise<MessageConversation | null> {
    const candidateConversations = await this.conversationsRepository.find({
      where: {
        meal: { id: mealId },
        type,
      },
      relations: ['meal', 'meal.host', 'members', 'members.user'],
    });

    return (
      candidateConversations.find((conversation) => {
        const conversationUserIds = conversation.members
          .map((member) => member.user.id)
          .sort((firstUserId, secondUserId) => firstUserId - secondUserId);

        return (
          conversationUserIds.length === userIds.length &&
          conversationUserIds.every(
            (conversationUserId, index) => conversationUserId === userIds[index],
          )
        );
      }) ?? null
    );
  }

  private async findLatestMessagesByConversationIds(
    conversationIds: number[],
  ): Promise<Map<number, MessageEntry>> {
    if (conversationIds.length === 0) {
      return new Map<number, MessageEntry>();
    }

    const messages = await this.messagesRepository.find({
      where: { conversation: { id: In(conversationIds) } },
      relations: ['sender', 'conversation'],
      order: { createdAt: 'DESC' },
    });

    const latestMessagesByConversationId = new Map<number, MessageEntry>();

    for (const message of messages) {
      if (!latestMessagesByConversationId.has(message.conversation.id)) {
        latestMessagesByConversationId.set(message.conversation.id, message);
      }
    }

    return latestMessagesByConversationId;
  }

  private async findConversationForMember(
    userId: number,
    conversationId: number,
  ): Promise<MessageConversation> {
    const membership = await this.membersRepository.findOne({
      where: {
        conversation: { id: conversationId },
        user: { id: userId },
      },
      relations: [
        'conversation',
        'conversation.meal',
        'conversation.meal.host',
        'conversation.members',
        'conversation.members.user',
      ],
    });

    if (!membership) {
      throw new ForbiddenException(
        "Vous n'avez pas acces a cette conversation",
      );
    }

    return membership.conversation;
  }

  private async findMealOrFail(mealId: number): Promise<Meal> {
    const meal = await this.mealsRepository.findOne({
      where: { id: mealId },
      relations: ['host'],
    });

    if (!meal) {
      throw new NotFoundException('Repas introuvable');
    }

    return meal;
  }

  private async findUserOrFail(userId: number): Promise<Utilisateur> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    return user;
  }

  private toConversationSummary(
    conversation: MessageConversation,
    latestMessage: MessageEntry | null,
  ): ConversationSummary {
    return {
      id: conversation.id,
      type: conversation.type,
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      meal: conversation.meal
        ? {
            mealId: conversation.meal.id,
            title: conversation.meal.title,
            dateTime: conversation.meal.dateTime,
            hostUserId: conversation.meal.host.id,
          }
        : null,
      members: conversation.members.map((member) => ({
        ...this.toConversationUserSummary(member.user),
        role: member.role,
        joinedAt: member.joinedAt,
      })),
      latestMessage: latestMessage ? this.toMessageSummary(latestMessage) : null,
    };
  }

  private toMessageSummary(message: MessageEntry): MessageSummary {
    return {
      id: message.id,
      body: message.body,
      createdAt: message.createdAt,
      sender: this.toConversationUserSummary(message.sender),
    };
  }

  private toConversationUserSummary(user: Utilisateur): ConversationUserSummary {
    return {
      userId: user.id,
      pseudo: user.pseudo,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePhotoUrl: user.profilePhotoUrl,
    };
  }
}
