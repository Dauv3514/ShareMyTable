import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role, RoleName } from './role.entity';

// Seed idempotent des roles systeme.
@Injectable()
export class RolesSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RolesSeedService.name);

  constructor(
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const requiredRoles = [RoleName.USER, RoleName.HOST, RoleName.ADMIN];

    for (const roleName of requiredRoles) {
      const existingRole = await this.rolesRepository.findOne({
        where: { name: roleName },
      });

      if (!existingRole) {
        await this.rolesRepository.save(this.rolesRepository.create({ name: roleName }));
        this.logger.log(`Role seed cree: ${roleName}`);
      }
    }
  }
}
