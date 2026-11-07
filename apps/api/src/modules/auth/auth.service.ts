import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '../../entities/user.entity';
import { Organization } from '../../entities/organization.entity';
import { BusinessProfile } from '../../entities/business-profile.entity';
import { UserRole } from '@turnoflow/shared';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(BusinessProfile)
    private readonly businessProfileRepo: Repository<BusinessProfile>,
    private readonly jwtService: JwtService
  ) {}

  async register(params: {
    email: string;
    password: string;
    fullName: string;
    businessName: string;
  }) {
    const existing = await this.userRepo.findOne({ where: { email: params.email } });
    if (existing) {
      throw new BadRequestException('El correo electrónico ya está registrado.');
    }

    // 1. Crear Organización
    const slug = params.businessName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-') + '-' + Math.random().toString(36).substring(2, 6);

    const org = this.orgRepo.create({
      name: params.businessName,
      slug
    });
    const savedOrg = await this.orgRepo.save(org);

    // 2. Crear Perfil de Negocio
    const profile = this.businessProfileRepo.create({
      organizationId: savedOrg.id,
      businessName: params.businessName
    });
    await this.businessProfileRepo.save(profile);

    // 3. Crear Usuario Administrador
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(params.password, salt);

    const user = this.userRepo.create({
      email: params.email,
      passwordHash,
      fullName: params.fullName,
      role: UserRole.ADMIN,
      organizationId: savedOrg.id
    });
    const savedUser = await this.userRepo.save(user);

    const token = this.generateToken(savedUser);
    return {
      accessToken: token,
      user: {
        id: savedUser.id,
        email: savedUser.email,
        fullName: savedUser.fullName,
        role: savedUser.role,
        organizationId: savedOrg.id,
        organizationName: savedOrg.name
      }
    };
  }

  async login(email: string, password: string) {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.organization', 'org')
      .where('user.email = :email', { email })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const token = this.generateToken(user);
    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: user.organization?.name || 'Mi Negocio'
      }
    };
  }

  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId
    };
    return this.jwtService.sign(payload);
  }
}
