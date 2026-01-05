import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Logger } from 'winston';
import { createLogger } from '../logger/logger';
import * as admin from 'firebase-admin';

@Injectable()
export class AuthGuard implements CanActivate {
    private readonly logger: Logger = createLogger(AuthGuard.name);

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        this.logger.info(`AuthGuard invoked for ${request.method} ${request.url}`);
        const token = request.headers.authorization?.split('Bearer ')[1];

        if (!token) {
            this.logger.warn('No token provided');
            throw new UnauthorizedException('No token provided');
        }

        try {
            const decodedToken = await admin.auth().verifyIdToken(token);
            request.user = {
                uid: decodedToken.uid,
                email: decodedToken.email,
                name: decodedToken.name,
            };
            return true;
        } catch (error) {
            this.logger.error('Invalid token', error);
            throw new UnauthorizedException('Invalid token');
        }
    }
}
