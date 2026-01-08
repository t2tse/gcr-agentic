import { Controller, Get } from '@nestjs/common';

@Controller('.well-known')
export class AuthDiscoveryController {
    @Get('oauth-protected-resource')
    getDiscovery() {
        return {
            resource: 'http://localhost:3002/mcp',
            authorization_servers: [
                "https://accounts.google.com"
            ]
        };
    }
}
