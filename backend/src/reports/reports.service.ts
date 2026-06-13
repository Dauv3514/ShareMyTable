import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../bookings/booking.entity';
import { Meal } from '../meals/meal.entity';
import { MessageConversation } from '../messaging/message-conversation.entity';
import { MessageConversationMember } from '../messaging/message-conversation-member.entity';
import { Utilisateur } from '../users/users.entity';
import { CreateReportDto } from './dto/create-report.dto';
import {
  Report,
  ReportReason,
  ReportStatus,
  ReportTargetType,
} from './report.entity';

type ReportResponse = {
  id: number;
  targetType: ReportTargetType;
  targetId: number;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  createdAt: Date;
  updatedAt: Date;
};

type ReportUserSummary = {
  userId: number;
  pseudo: string | null;
  email: string;
  firstName: string;
  lastName: string;
  profilePhotoUrl: string | null;
  displayName: string;
};

type AdminReportTargetResponse = {
  label: string;
  detail: string | null;
  href: string | null;
  user: ReportUserSummary | null;
  meal: {
    id: number;
    title: string | null;
    status: string;
    dateTime: Date;
    host: ReportUserSummary | null;
  } | null;
  booking: {
    id: number;
    status: string;
    seats: number;
    guest: ReportUserSummary | null;
    mealTitle: string | null;
  } | null;
  conversation: {
    id: number;
    title: string | null;
    type: string;
    mealTitle: string | null;
    members: ReportUserSummary[];
  } | null;
};

type AdminReportResponse = ReportResponse & {
  reporter: ReportUserSummary | null;
  target: AdminReportTargetResponse;
  adminNote: string | null;
  reviewedBy: ReportUserSummary | null;
  reviewedAt: Date | null;
};

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reportsRepository: Repository<Report>,
    @InjectRepository(Utilisateur)
    private readonly usersRepository: Repository<Utilisateur>,
    @InjectRepository(Meal)
    private readonly mealsRepository: Repository<Meal>,
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    @InjectRepository(MessageConversation)
    private readonly conversationsRepository: Repository<MessageConversation>,
    @InjectRepository(MessageConversationMember)
    private readonly conversationMembersRepository: Repository<MessageConversationMember>,
  ) {}

  async createForUser(
    reporterUserId: number,
    dto: CreateReportDto,
  ): Promise<ReportResponse> {
    const reporter = await this.usersRepository.findOne({
      where: { id: reporterUserId },
    });

    if (!reporter) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    const targetType = this.parseEnumValue(
      ReportTargetType,
      dto.targetType,
      'Type de signalement invalide.',
    );
    const reason = this.parseEnumValue(
      ReportReason,
      dto.reason,
      'Raison de signalement invalide.',
    );
    const targetId = this.parsePositiveInteger(dto.targetId, 'Cible invalide.');
    const description = this.normalizeDescription(dto.description);

    const report = this.reportsRepository.create({
      reporter,
      targetType,
      targetId,
      reason,
      description,
      status: ReportStatus.PENDING,
      reportedUser: null,
      reportedMeal: null,
      reportedBooking: null,
      reportedConversation: null,
      adminNote: null,
      reviewedBy: null,
      reviewedAt: null,
    });

    await this.attachReportTarget(report, reporterUserId);

    const savedReport = await this.reportsRepository.save(report);
    return this.toReportResponse(savedReport);
  }

  async findMine(reporterUserId: number): Promise<ReportResponse[]> {
    const reports = await this.reportsRepository.find({
      where: {
        reporter: {
          id: reporterUserId,
        },
      },
      order: {
        createdAt: 'DESC',
      },
      take: 100,
    });

    return reports.map((report) => this.toReportResponse(report));
  }

  async findAllForAdmin(): Promise<AdminReportResponse[]> {
    const reports = await this.reportsRepository.find({
      relations: [
        'reporter',
        'reportedUser',
        'reportedMeal',
        'reportedMeal.host',
        'reportedBooking',
        'reportedBooking.guestUser',
        'reportedBooking.meal',
        'reportedBooking.meal.host',
        'reportedConversation',
        'reportedConversation.meal',
        'reportedConversation.members',
        'reportedConversation.members.user',
        'reviewedBy',
      ],
      order: {
        createdAt: 'DESC',
      },
      take: 250,
    });

    return reports.map((report) => this.toAdminReportResponse(report));
  }

  private async attachReportTarget(report: Report, reporterUserId: number) {
    if (report.targetType === ReportTargetType.USER) {
      const reportedUser = await this.usersRepository.findOne({
        where: { id: report.targetId },
      });

      if (!reportedUser) {
        throw new NotFoundException('Utilisateur signale introuvable.');
      }

      if (reportedUser.id === reporterUserId) {
        throw new BadRequestException(
          'Tu ne peux pas signaler ton propre profil.',
        );
      }

      report.reportedUser = reportedUser;
      return;
    }

    if (report.targetType === ReportTargetType.MEAL) {
      const meal = await this.mealsRepository.findOne({
        where: { id: report.targetId },
      });

      if (!meal) {
        throw new NotFoundException('Repas signale introuvable.');
      }

      report.reportedMeal = meal;
      return;
    }

    if (report.targetType === ReportTargetType.BOOKING) {
      const booking = await this.bookingsRepository.findOne({
        where: { id: report.targetId },
        relations: ['guestUser', 'meal', 'meal.host'],
      });

      if (!booking) {
        throw new NotFoundException('Reservation signalee introuvable.');
      }

      const isGuest = booking.guestUser.id === reporterUserId;
      const isHost = booking.meal.host.id === reporterUserId;

      if (!isGuest && !isHost) {
        throw new ForbiddenException(
          'Tu ne peux signaler que tes propres reservations.',
        );
      }

      report.reportedBooking = booking;
      return;
    }

    if (report.targetType === ReportTargetType.CONVERSATION) {
      const member = await this.conversationMembersRepository.findOne({
        where: {
          conversation: { id: report.targetId },
          user: { id: reporterUserId },
        },
        relations: ['conversation'],
      });

      if (!member) {
        throw new NotFoundException('Conversation signalee introuvable.');
      }

      const conversation = await this.conversationsRepository.findOne({
        where: { id: member.conversation.id },
      });

      if (!conversation) {
        throw new NotFoundException('Conversation signalee introuvable.');
      }

      report.reportedConversation = conversation;
      return;
    }

    throw new BadRequestException('Type de signalement invalide.');
  }

  private parseEnumValue<T extends Record<string, string>>(
    enumObject: T,
    value: unknown,
    errorMessage: string,
  ): T[keyof T] {
    if (
      typeof value === 'string' &&
      Object.values(enumObject).includes(value)
    ) {
      return value as T[keyof T];
    }

    throw new BadRequestException(errorMessage);
  }

  private parsePositiveInteger(value: unknown, errorMessage: string) {
    const numberValue =
      typeof value === 'number' ? value : Number.parseInt(String(value), 10);

    if (!Number.isInteger(numberValue) || numberValue < 1) {
      throw new BadRequestException(errorMessage);
    }

    return numberValue;
  }

  private normalizeDescription(value?: string | null) {
    const trimmedValue = value?.trim();

    if (!trimmedValue) {
      return null;
    }

    if (trimmedValue.length > 2000) {
      throw new BadRequestException(
        'La description du signalement est trop longue.',
      );
    }

    return trimmedValue;
  }

  private toReportResponse(report: Report): ReportResponse {
    return {
      id: report.id,
      targetType: report.targetType,
      targetId: report.targetId,
      reason: report.reason,
      description: report.description,
      status: report.status,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    };
  }

  private toAdminReportResponse(report: Report): AdminReportResponse {
    return {
      ...this.toReportResponse(report),
      reporter: this.toUserSummary(report.reporter),
      target: this.toAdminTargetResponse(report),
      adminNote: report.adminNote,
      reviewedBy: this.toUserSummary(report.reviewedBy),
      reviewedAt: report.reviewedAt,
    };
  }

  private toAdminTargetResponse(report: Report): AdminReportTargetResponse {
    if (report.targetType === ReportTargetType.USER) {
      const user = this.toUserSummary(report.reportedUser);

      return {
        label: user?.displayName ?? `Utilisateur #${report.targetId}`,
        detail: user?.email ?? null,
        href: user ? `/profil/${user.userId}` : null,
        user,
        meal: null,
        booking: null,
        conversation: null,
      };
    }

    if (report.targetType === ReportTargetType.MEAL) {
      const meal = report.reportedMeal;
      const host = this.toUserSummary(meal?.host);

      return {
        label: meal?.title ?? `Repas #${report.targetId}`,
        detail: host ? `Hôte : ${host.displayName}` : null,
        href: meal ? `/evenements/${meal.id}` : null,
        user: null,
        meal: meal
          ? {
              id: meal.id,
              title: meal.title,
              status: meal.status,
              dateTime: meal.dateTime,
              host,
            }
          : null,
        booking: null,
        conversation: null,
      };
    }

    if (report.targetType === ReportTargetType.BOOKING) {
      const booking = report.reportedBooking;
      const guest = this.toUserSummary(booking?.guestUser);
      const mealTitle = booking?.meal?.title ?? null;

      return {
        label: booking ? `Réservation #${booking.id}` : `Réservation #${report.targetId}`,
        detail: [guest?.displayName, mealTitle].filter(Boolean).join(' - ') || null,
        href: booking ? `/reservations/${booking.id}` : null,
        user: null,
        meal: null,
        booking: booking
          ? {
              id: booking.id,
              status: booking.bookingStatus,
              seats: booking.seats,
              guest,
              mealTitle,
            }
          : null,
        conversation: null,
      };
    }

    if (report.targetType === ReportTargetType.CONVERSATION) {
      const conversation = report.reportedConversation;
      const members =
        conversation?.members
          ?.map((member) => this.toUserSummary(member.user))
          .filter((member): member is ReportUserSummary => Boolean(member)) ?? [];

      return {
        label:
          conversation?.title ??
          conversation?.meal?.title ??
          `Conversation #${report.targetId}`,
        detail: conversation?.meal?.title
          ? `Repas : ${conversation.meal.title}`
          : `${members.length} membre${members.length > 1 ? 's' : ''}`,
        href: conversation ? `/messages/conversations/${conversation.id}` : null,
        user: null,
        meal: null,
        booking: null,
        conversation: conversation
          ? {
              id: conversation.id,
              title: conversation.title,
              type: conversation.type,
              mealTitle: conversation.meal?.title ?? null,
              members,
            }
          : null,
      };
    }

    return {
      label: `Cible #${report.targetId}`,
      detail: null,
      href: null,
      user: null,
      meal: null,
      booking: null,
      conversation: null,
    };
  }

  private toUserSummary(user?: Utilisateur | null): ReportUserSummary | null {
    if (!user) {
      return null;
    }

    const fullName = [user.firstName, user.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    return {
      userId: user.id,
      pseudo: user.pseudo,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePhotoUrl: user.profilePhotoUrl,
      displayName: user.pseudo || fullName || user.email,
    };
  }
}
