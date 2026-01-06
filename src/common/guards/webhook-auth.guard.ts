import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class WebhookAuthGuard implements CanActivate {
  private readonly webhookSecret = process.env.WEBHOOK_SECRET || 'your-webhook-secret-key-change-in-production';

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Verify using shared secret token in header
    const secretToken = request.headers['x-webhook-secret'] as string;

    if (secretToken && secretToken === this.webhookSecret) {
      return true;
    }

    throw new UnauthorizedException('Invalid webhook secret key');
  }
}
