import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InscriptionDto } from '../auth/auth.dto';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
    ) { }

    async inscription(userDto: InscriptionDto) {
        const {
            pseudo,
            password_hash,
        } = userDto;

        // Vérification du pseudo existant
        if (pseudo) {
            const existingUser = await this.usersService.findByPseudo(pseudo);
            if (existingUser) {
                throw new BadRequestException('Ce pseudo existe déjà');
            }
        }

        if (!password_hash) {
            throw new BadRequestException('Le mot de passe est obligatoire');
        }

        // Hash du mot de passe
        const hashedPassword = await bcrypt.hash(password_hash, 10);

        const user = await this.usersService.create({
            ...userDto,
            password_hash: hashedPassword,
        });

        return {
            success: true,
            message: "Utilisateur créé avec succès",
            username: user.pseudo,
            userId: user.id,
        };
    }

    async connexion(email: string, pass: string) {
        const user = await this.usersService.findOne(email);
        if (!user) throw new UnauthorizedException('Cet email n\'est pas enregistré');

        const isValid = await bcrypt.compare(pass, user.passwordHash);
        if (!isValid) throw new UnauthorizedException('Mot de passe incorrect');

        const payload = {
            sub: user.id,
            email: user.email,
            roles: user.roles,
            nom: user.lastName
        };
        return { access_token: await this.jwtService.signAsync(payload) };
    }
}
