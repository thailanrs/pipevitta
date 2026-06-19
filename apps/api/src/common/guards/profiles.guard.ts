import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserProfile } from '@pipevitta/database';
import { PROFILES_KEY } from '../decorators/profiles.decorator';

@Injectable()
export class ProfilesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Retrieve required profiles metadata from route handlers or controllers
    const requiredProfiles = this.reflector.getAllAndOverride<UserProfile[]>(PROFILES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no profiles are specified, route is public or defaults to general user access
    if (!requiredProfiles || requiredProfiles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.profiles) {
      throw new ForbiddenException('User profiles not found or user not authenticated');
    }

    // Check if the user has at least one of the required profiles (RBAC check)
    const hasProfile = requiredProfiles.some((profile) => user.profiles.includes(profile));

    if (!hasProfile) {
      throw new ForbiddenException('User does not have the required access permissions');
    }

    return true;
  }
}
