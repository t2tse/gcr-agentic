import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Logger } from 'winston';
import { createLogger } from '../logger/logger';
import * as admin from 'firebase-admin';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthGuard implements CanActivate {
    private readonly logger: Logger = createLogger(AuthGuard.name);

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        this.logger.info(`AuthGuard invoked for ${request.method} ${request.url}`);
        const token = request.headers.authorization?.split('Bearer ')[1];

        if (!token) {
            this.logger.warn('No token provided');
            const response = context.switchToHttp().getResponse();
            response.setHeader('WWW-Authenticate', 'Bearer authorization_server="https://accounts.google.com"');
            throw new UnauthorizedException('No token provided');
        }

        try {
            // 1. Try verify as Firebase ID Token (for Portal)
            const decodedToken = await admin.auth().verifyIdToken(token);
            request.user = {
                uid: decodedToken.uid,
                email: decodedToken.email,
                name: decodedToken.name,
            };
            return true;
        } catch (firebaseError) {
            // 2. Try verify as Google Access Token (for MCP Client)
            try {
                const client = new OAuth2Client();
                const tokenInfo = await client.getTokenInfo(token);

                if (tokenInfo.sub) {
                    // Map Google User ID to Firebase User
                    const firebaseUser = await admin.auth().getUserByProviderUid('google.com', tokenInfo.sub);
                    request.user = {
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        name: firebaseUser.displayName,
                    };
                    return true;
                }
            } catch (googleError) {
                this.logger.error('Token verification failed for both Firebase and Google', { firebaseError, googleError });
            }

            this.logger.error('Invalid token', firebaseError);
            const response = context.switchToHttp().getResponse();
            response.setHeader('WWW-Authenticate', 'Bearer authorization_server="https://accounts.google.com"');
            throw new UnauthorizedException('Invalid token');
        }
    }
}
