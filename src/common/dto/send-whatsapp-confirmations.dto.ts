import { IsArray, IsOptional, ArrayMinSize, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendWhatsAppConfirmationsDto {
  @ApiProperty({
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
    description: 'Array of Bank Order IDs to send WhatsApp confirmations',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  bankOrderIds?: string[];

  @ApiProperty({
    example: ['507f1f77bcf86cd799439013', '507f1f77bcf86cd799439014'],
    description: 'Array of BIP Order IDs to send WhatsApp confirmations',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  bipOrderIds?: string[];
}
