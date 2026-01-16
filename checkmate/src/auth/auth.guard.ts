import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'winston';
import { createLogger } from '../logger/logger';
import * as admin from 'firebase-admin';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthGuard implements CanActivate {
    private readonly logger: Logger = createLogger(AuthGuard.name);
    private readonly googleClientId: string;

    constructor(private configService: ConfigService) {
        this.googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID') || '';
        if (!this.googleClientId) {
            this.logger.error('GOOGLE_CLIENT_ID is not configured in environment variables');
        }
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        this.logger.info(`AuthGuard invoked for ${request.method} ${request.url}`);
        const authHeader = request.headers.authorization;
        const token = authHeader?.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : undefined;

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
            this.logger.debug(`Authenticated by Firebase ID Token: ${request.user.uid} ${request.user.email}`);
            return true;
        } catch (firebaseError) {
            // 2. Try verify as Google Access Token (for MCP Client)
            try {
                const client = new OAuth2Client();
                const tokenInfo = await client.getTokenInfo(token);

                // Google Robustness: Verify Audience/Authorized Party
                // For Access Tokens, azp (authorized party) or aud (audience) should match our Client ID
                const isAuthorized = (tokenInfo.azp === this.googleClientId) || (tokenInfo.aud === this.googleClientId);

                if (!isAuthorized) {
                    this.logger.error(`Unauthorized client attempt. Token aud: ${tokenInfo.aud}, azp: ${tokenInfo.azp}. Expected: ${this.googleClientId}`);
                    throw new UnauthorizedException('Token was not issued for this application');
                }

                if (tokenInfo.sub) {
                    try {
                        // Map Google User ID to Firebase User (Preferred: Provider UID)
                        const firebaseUser = await admin.auth().getUserByProviderUid('google.com', tokenInfo.sub);
                        request.user = {
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            name: firebaseUser.displayName,
                        };
                        this.logger.debug(`Authenticated by Google Access TokenInfo sub: ${request.user.uid} ${request.user.email}`);
                    } catch (e) {
                        this.logger.warn(`Firebase user not found by Google sub ${tokenInfo.sub}. Attempting email mapping for ${tokenInfo.email}.`);

                        try {
                            // Fallback Mapping: Map by Email (Common but requires unique email settings in Firebase)
                            if (tokenInfo.email) {
                                const firebaseUserByEmail = await admin.auth().getUserByEmail(tokenInfo.email);
                                request.user = {
                                    uid: firebaseUserByEmail.uid,
                                    email: firebaseUserByEmail.email,
                                    name: firebaseUserByEmail.displayName,
                                };
                                this.logger.debug(`Authenticated by Google Access TokenInfo email: ${request.user.uid} ${request.user.email}`);
                            } else {
                                throw new Error('No email in token info');
                            }
                        } catch (emailError) {
                            this.logger.error(`Firebase user not found for email ${tokenInfo.email} and sub ${tokenInfo.sub}. Rejecting request.`);
                            throw new UnauthorizedException('No matching Firebase user found. Please sign up via the Portal first.');
                        }
                    }
                    return true;
                }
            } catch (googleError) {
                if (googleError instanceof UnauthorizedException) throw googleError;
                this.logger.error('Token verification failed for both Firebase and Google', { firebaseError, googleError });
            }

            this.logger.error('Invalid token', firebaseError);
            const response = context.switchToHttp().getResponse();
            response.setHeader('WWW-Authenticate', 'Bearer authorization_server="https://accounts.google.com"');
            throw new UnauthorizedException('Invalid token');
        }
    }
}
