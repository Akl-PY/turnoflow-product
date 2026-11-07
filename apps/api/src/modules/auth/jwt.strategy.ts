import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'turnoflow-super-secret-key-32chars-min'
    });
  }

  async validate(payload: any) {
    if (!payload || !payload.sub || !payload.organizationId) {
      throw new UnauthorizedException('Token inválido o sin contexto de organización.');
    }
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      organizationId: payload.organizationId
    };
  }
}
