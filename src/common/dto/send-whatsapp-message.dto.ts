import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendWhatsAppMessageDto {
  @ApiProperty({
    example: '+923001234567',
    description: 'Customer phone number with country code',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Customer name',
  })
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @ApiProperty({
    example: 'REF-2024-001',
    description: 'Order number (PO number)',
  })
  @IsString()
  @IsNotEmpty()
  orderNumber: string;

  @ApiProperty({
    example: 'Samsung Galaxy S24 - 256GB',
    description: 'Product name/description',
  })
  @IsString()
  @IsNotEmpty()
  product: string;

  @ApiProperty({
    example: 150000,
    description: 'Order price/amount',
  })
  @IsNumber()
  @Min(0)
  orderPrice: number;

  @ApiProperty({
    example: 'House 123, Street 45, Lahore',
    description: 'Delivery address',
  })
  @IsString()
  @IsNotEmpty()
  address: string;
}
