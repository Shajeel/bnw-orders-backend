import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum OrderConfirmationStatus {
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

export class SimpleWhatsAppWebhookDto {
  @ApiProperty({
    example: 'REF-2024-001',
    description: 'PO Number (refNo for bank orders or eforms for BIP orders)',
  })
  @IsString()
  poNumber: string;

  @ApiProperty({
    example: 'confirmed',
    description: 'Order status - confirmed or cancelled',
    enum: OrderConfirmationStatus,
  })
  @IsEnum(OrderConfirmationStatus)
  status: OrderConfirmationStatus;
}
