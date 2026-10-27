import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import { NotificationTargetsService } from './notification-targets.service.js';
import { PushDeliveryService } from './push-delivery.service.js';

@Module({ imports: [AuthModule], controllers: [NotificationsController], providers: [NotificationsService, NotificationTargetsService, PushDeliveryService] })
export class NotificationsModule {}
