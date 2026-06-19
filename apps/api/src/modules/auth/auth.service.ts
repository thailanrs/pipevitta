import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../../common/database/database.service';
import { tenantLocalStorage } from '@pipevitta/database';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async login(
    tenantSlug: string,
    email: string,
    passwordHash: string,
  ): Promise<any> {
    // 1. Locate tenant by its unique slug
    const tenant = await this.db.client.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant) {
      throw new UnauthorizedException('Clínica não encontrada');
    }

    // 2. Locate user inside the found tenant scope (using tenantLocalStorage.run to satisfy RLS check)
    const user = await tenantLocalStorage.run(
      { tenantId: tenant.id },
      async () => {
        return await this.db.client.user.findUnique({
          where: {
            tenantId_email: {
              tenantId: tenant.id,
              email,
            },
          },
        });
      },
    );

    // 3. Verify password hash matches
    if (!user || user.passwordHash !== passwordHash) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    // 4. Construct JWT Payload containing user roles and tenant identifiers
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      tenantId: tenant.id,
      profiles: user.profiles,
    };

    // 5. Generate signed JWT token
    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profiles: user.profiles,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
      },
    };
  }
}
