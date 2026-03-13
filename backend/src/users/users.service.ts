import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Utilisateur, AccountStatus, UserRole } from './users.entity';
import { InscriptionDto } from '../auth/auth.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Utilisateur)
    private usersRepository: Repository<Utilisateur>,
  ) {}

  async create(userDto: InscriptionDto) {
    const newUser = this.usersRepository.create({
      pseudo: userDto.pseudo,
      email: userDto.email,
      firstName: userDto.first_name,
      lastName: userDto.last_name,
      profilePhotoUrl: userDto.profile_photo_url,
      passwordHash: userDto.password_hash,
      city: userDto.city,
      country: userDto.country,
      bio: userDto.bio,
      birthDate: userDto.birth_date ? new Date(userDto.birth_date) : undefined,
      accountStatus: AccountStatus.ACTIVE,
      roles: UserRole.USER,
    });
    return this.usersRepository.save(newUser);
  }

  async findAll(): Promise<Utilisateur[]> {
    return this.usersRepository.find();
  }

  async findOne(email: string): Promise<Utilisateur | undefined> {
    const user = await this.usersRepository.findOne({ where: { email } });
    return user ?? undefined;
  }

  async findByPseudo(pseudo: string): Promise<Utilisateur | undefined> {
    const user = await this.usersRepository.findOne({ where: { pseudo } });
    return user ?? undefined;
  }

  async findOneUser(id: number): Promise<Utilisateur | undefined> {
    const user = await this.usersRepository.findOne({ where: { id } });
    return user ?? undefined;
  }
}