import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('.well-known')
export class AuthDiscoveryController {
    constructor(private configService: ConfigService) { }

    @Get('oauth-protected-resource')
    getDiscovery() {
        const appHost = this.configService.get<string>('APP_HOST') || 'http://localhost:3002';
        return {
            resource: `${appHost}/mcp`,
            authorization_servers: [
                "https://accounts.google.com"
            ]
        };
    }
}
