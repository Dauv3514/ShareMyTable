import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Meal } from '../meals/meal.entity';
import {
  PushNotificationCategory,
  PushNotificationsService,
} from '../push-notifications/push-notifications.service';
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
  unreadCount: number;
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
    private readonly pushNotificationsService: PushNotificationsService,
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

    const conversations = await this.mergeDuplicateVisibleDirectConversations(
      memberships
      .map((membership) => membership.conversation)
      .filter(
        (conversation, index, allConversations) =>
          allConversations.findIndex(
            (currentConversation) => currentConversation.id === conversation.id,
          ) === index,
      ),
    );

    conversations
      .sort(
        (firstConversation, secondConversation) =>
          secondConversation.updatedAt.getTime() -
          firstConversation.updatedAt.getTime(),
      );

    const latestMessagesByConversationId =
      await this.findLatestMessagesByConversationIds(
        conversations.map((conversation) => conversation.id),
      );
    const unreadCountsByConversationId =
      await this.findUnreadCountsForUserByConversationIds(
        userId,
        conversations.map((conversation) => conversation.id),
      );

    return conversations.map((conversation) =>
      this.toConversationSummary(
        conversation,
        latestMessagesByConversationId.get(conversation.id) ?? null,
        unreadCountsByConversationId.get(conversation.id) ?? 0,
      ),
    );
  }

  async getUnreadMessagesCount(
    userId: number,
  ): Promise<{ unreadCount: number }> {
    const unreadCount = await this.findUnreadMessagesCountForUser(userId);

    return { unreadCount };
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
    await this.markConversationAsRead(userId, conversation.id);

    return {
      ...this.toConversationSummary(conversation, latestMessage, 0),
      messages: messages.map((message) => this.toMessageSummary(message)),
    };
  }

  async markConversationAsRead(
    userId: number,
    conversationId: number,
  ): Promise<{ unreadCount: number }> {
    const membership = await this.membersRepository.findOne({
      where: {
        conversation: { id: conversationId },
        user: { id: userId },
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        "Vous n'avez pas acces a cette conversation",
      );
    }

    membership.lastReadAt = new Date();
    await this.membersRepository.save(membership);

    return this.getUnreadMessagesCount(userId);
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
      throw new BadRequestException('Le message ne peut pas être vide');
    }

    const message = this.messagesRepository.create({
      conversation,
      sender,
      body: normalizedBody,
    });

    const savedMessage = await this.messagesRepository.save(message);
    conversation.updatedAt = new Date();
    await this.conversationsRepository.save(conversation);
    await this.markConversationAsRead(userId, conversation.id);

    await this.notifyConversationMembers(conversation, savedMessage, sender);

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

    const conversation = await this.ensurePairConversation({
      meal,
      targetType: MessageConversationType.BOOKING_DIRECT,
      reusableTypes: [
        MessageConversationType.MEAL_DIRECT,
        MessageConversationType.BOOKING_DIRECT,
      ],
      title: meal.title ? `Reservation - ${meal.title}` : 'Reservation',
      members: [
        { user: meal.host, role: MessageConversationMemberRole.HOST },
        { user: guest, role: MessageConversationMemberRole.GUEST },
      ],
    });

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
        : await this.removeMealGroupConversation(meal.id);

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
        title: meal.title ? `Groupe - ${meal.title}` : 'Groupe de l\'événement',
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

        const conversation = await this.ensurePairConversation({
          meal,
          targetType: MessageConversationType.MEAL_DIRECT,
          reusableTypes: [
            MessageConversationType.MEAL_DIRECT,
            MessageConversationType.BOOKING_DIRECT,
          ],
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

        pairConversationIds.push(conversation.id);
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

  private async ensurePairConversation(params: {
    meal: Meal;
    targetType: MessageConversationType.BOOKING_DIRECT | MessageConversationType.MEAL_DIRECT;
    reusableTypes: Array<
      MessageConversationType.BOOKING_DIRECT | MessageConversationType.MEAL_DIRECT
    >;
    title: string | null;
    members: Array<{
      user: Utilisateur;
      role: MessageConversationMemberRole;
    }>;
  }): Promise<MessageConversation> {
    const pairUserIds = params.members
      .map((member) => member.user.id)
      .sort((firstUserId, secondUserId) => firstUserId - secondUserId);
    const existingConversations = await this.findPairConversations(
      params.meal.id,
      params.reusableTypes,
      pairUserIds,
    );

    if (existingConversations.length === 0) {
      return this.createConversationWithMembers({
        type: params.targetType,
        meal: params.meal,
        title: params.title,
        members: params.members,
      });
    }

    const canonicalConversation = this.pickCanonicalPairConversation(
      existingConversations,
      params.targetType,
    );
    const nextType =
      canonicalConversation.type === MessageConversationType.MEAL_DIRECT
        ? canonicalConversation.type
        : params.targetType;
    const nextTitle =
      nextType === params.targetType ? params.title : canonicalConversation.title;

    if (
      canonicalConversation.type !== nextType ||
      canonicalConversation.title !== nextTitle
    ) {
      canonicalConversation.type = nextType;
      canonicalConversation.title = nextTitle;
      await this.conversationsRepository.save(canonicalConversation);
    }

    await this.syncConversationMembers(canonicalConversation, params.members);
    await this.mergeDuplicatePairConversations(
      canonicalConversation,
      existingConversations.filter(
        (conversation) => conversation.id !== canonicalConversation.id,
      ),
    );

    return this.conversationsRepository.findOneOrFail({
      where: { id: canonicalConversation.id },
      relations: ['meal', 'meal.host', 'members', 'members.user'],
    });
  }

  private async mergeDuplicateVisibleDirectConversations(
    conversations: MessageConversation[],
  ): Promise<MessageConversation[]> {
    const conversationIdsToRemove = new Set<number>();
    const directConversationsByPair = new Map<string, MessageConversation[]>();

    for (const conversation of conversations) {
      if (
        !conversation.meal ||
        conversation.type === MessageConversationType.MEAL_GROUP ||
        conversation.members.length !== 2
      ) {
        continue;
      }

      const pairKey = this.buildPairKey(conversation);
      const pairConversations = directConversationsByPair.get(pairKey) ?? [];
      pairConversations.push(conversation);
      directConversationsByPair.set(pairKey, pairConversations);
    }

    for (const pairConversations of directConversationsByPair.values()) {
      if (pairConversations.length <= 1) {
        continue;
      }

      const canonicalConversation = this.pickCanonicalPairConversation(
        pairConversations,
        MessageConversationType.MEAL_DIRECT,
      );
      const duplicateConversations = pairConversations.filter(
        (conversation) => conversation.id !== canonicalConversation.id,
      );

      await this.mergeDuplicatePairConversations(
        canonicalConversation,
        duplicateConversations,
      );

      for (const duplicateConversation of duplicateConversations) {
        conversationIdsToRemove.add(duplicateConversation.id);
      }
    }

    return conversations.filter(
      (conversation) => !conversationIdsToRemove.has(conversation.id),
    );
  }

  private pickCanonicalPairConversation(
    conversations: MessageConversation[],
    preferredType: MessageConversationType,
  ): MessageConversation {
    return [...conversations].sort((firstConversation, secondConversation) => {
      const firstTypeScore = firstConversation.type === preferredType ? 1 : 0;
      const secondTypeScore = secondConversation.type === preferredType ? 1 : 0;

      if (firstTypeScore !== secondTypeScore) {
        return secondTypeScore - firstTypeScore;
      }

      return (
        secondConversation.updatedAt.getTime() -
        firstConversation.updatedAt.getTime()
      );
    })[0];
  }

  private async mergeDuplicatePairConversations(
    canonicalConversation: MessageConversation,
    duplicateConversations: MessageConversation[],
  ): Promise<void> {
    let shouldUpdateCanonicalConversation = false;

    for (const duplicateConversation of duplicateConversations) {
      if (
        duplicateConversation.updatedAt.getTime() >
        canonicalConversation.updatedAt.getTime()
      ) {
        canonicalConversation.updatedAt = duplicateConversation.updatedAt;
        shouldUpdateCanonicalConversation = true;
      }

      await this.messagesRepository
        .createQueryBuilder()
        .update(MessageEntry)
        .set({ conversation: canonicalConversation })
        .where('conversation_id = :conversationId', {
          conversationId: duplicateConversation.id,
        })
        .execute();

      await this.conversationsRepository.remove(duplicateConversation);
    }

    if (shouldUpdateCanonicalConversation) {
      await this.conversationsRepository.save(canonicalConversation);
    }
  }

  private buildPairKey(conversation: MessageConversation): string {
    const mealId = conversation.meal?.id ?? 'no-meal';
    const userIds = conversation.members
      .map((member) => member.user.id)
      .sort((firstUserId, secondUserId) => firstUserId - secondUserId)
      .join(':');

    return `${mealId}:${userIds}`;
  }

  private async removeMealGroupConversation(
    mealId: number,
  ): Promise<MessageConversation | null> {
    const existingConversation = await this.conversationsRepository.findOne({
      where: {
        meal: { id: mealId },
        type: MessageConversationType.MEAL_GROUP,
      },
    });

    if (!existingConversation) {
      return null;
    }

    await this.conversationsRepository.remove(existingConversation);
    return null;
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

  private async findPairConversations(
    mealId: number,
    types: MessageConversationType[],
    userIds: number[],
  ): Promise<MessageConversation[]> {
    const candidateConversations = await this.conversationsRepository.find({
      where: {
        meal: { id: mealId },
        type: In(types),
      },
      relations: ['meal', 'meal.host', 'members', 'members.user'],
    });

    return candidateConversations.filter((conversation) => {
        const conversationUserIds = conversation.members
          .map((member) => member.user.id)
          .sort((firstUserId, secondUserId) => firstUserId - secondUserId);

        return (
          conversationUserIds.length === userIds.length &&
          conversationUserIds.every(
            (conversationUserId, index) => conversationUserId === userIds[index],
          )
        );
      });
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

  private async findUnreadCountsForUserByConversationIds(
    userId: number,
    conversationIds: number[],
  ): Promise<Map<number, number>> {
    if (conversationIds.length === 0) {
      return new Map<number, number>();
    }

    const rows = await this.messagesRepository
      .createQueryBuilder('message')
      .select('message.conversation_id', 'conversationId')
      .addSelect('COUNT(message.id)', 'unreadCount')
      .innerJoin(
        MessageConversationMember,
        'membership',
        'membership.conversation_id = message.conversation_id AND membership.user_id = :userId',
        { userId },
      )
      .where('message.conversation_id IN (:...conversationIds)', {
        conversationIds,
      })
      .andWhere('message.sender_user_id != :userId', { userId })
      .andWhere(
        'message.created_at > COALESCE(membership.last_read_at, membership.joined_at)',
      )
      .groupBy('message.conversation_id')
      .getRawMany<{ conversationId: string; unreadCount: string }>();

    return new Map(
      rows.map((row) => [
        Number(row.conversationId),
        Number(row.unreadCount),
      ]),
    );
  }

  private async findUnreadMessagesCountForUser(userId: number): Promise<number> {
    const unreadCount = await this.messagesRepository
      .createQueryBuilder('message')
      .innerJoin(
        MessageConversationMember,
        'membership',
        'membership.conversation_id = message.conversation_id AND membership.user_id = :userId',
        { userId },
      )
      .where('message.sender_user_id != :userId', { userId })
      .andWhere(
        'message.created_at > COALESCE(membership.last_read_at, membership.joined_at)',
      )
      .getCount();

    return unreadCount;
  }

  private async notifyConversationMembers(
    conversation: MessageConversation,
    message: MessageEntry,
    sender: Utilisateur,
  ): Promise<void> {
    const recipientUserIds = (conversation.members ?? [])
      .map((member) => member.user?.id)
      .filter(
        (memberUserId): memberUserId is number =>
          Boolean(memberUserId) && memberUserId !== sender.id,
      );

    if (recipientUserIds.length === 0) {
      return;
    }

    const senderName =
      sender.pseudo ||
      [sender.firstName, sender.lastName].filter(Boolean).join(' ').trim() ||
      'Nouveau message';
    const mealTitle = conversation.meal?.title;
    const body =
      message.body.length > 90 ? `${message.body.slice(0, 87)}...` : message.body;

    await this.pushNotificationsService.notifyUsers(
      recipientUserIds,
      {
        title: mealTitle ? `${senderName} - ${mealTitle}` : senderName,
        body,
        url: `/messages/conversations/${conversation.id}`,
        tag: `conversation-${conversation.id}`,
        data: {
          type: 'message',
          conversationId: conversation.id,
          messageId: message.id,
        },
      },
      PushNotificationCategory.MESSAGES,
    );
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
      throw new NotFoundException('Événement introuvable');
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
    unreadCount = 0,
  ): ConversationSummary {
    return {
      id: conversation.id,
      type: conversation.type,
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      unreadCount,
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
