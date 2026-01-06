import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum OrderConfirmationStatus {
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

export enum OrderType {
  BANK = 'bank',
  BIP = 'bip',
}

export class WhatsAppWebhookDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Order ID (MongoDB ObjectId)',
  })
  @IsString()
  orderId: string;

  @ApiProperty({
    example: 'bank',
    description: 'Order type (bank or bip)',
    enum: OrderType,
  })
  @IsEnum(OrderType)
  orderType: OrderType;

  @ApiProperty({
    example: 'whatsapp_bank_507f1f77bcf86cd799439011_1704556800000_abc123',
    description: 'Unique confirmation token for the order',
  })
  @IsString()
  confirmationToken: string;

  @ApiProperty({
    example: 'confirmed',
    description: 'Confirmation status from customer',
    enum: OrderConfirmationStatus,
  })
  @IsEnum(OrderConfirmationStatus)
  status: OrderConfirmationStatus;

  @ApiProperty({
    example: '+923001234567',
    description: 'Customer phone number',
    required: false,
  })
  @IsString()
  phoneNumber?: string;
}
