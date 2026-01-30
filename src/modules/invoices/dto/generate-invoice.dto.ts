import { IsNotEmpty, IsDateString, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateInvoiceDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Bank MongoDB ObjectId',
  })
  @IsMongoId()
  @IsNotEmpty()
  bankId: string;

  @ApiProperty({
    example: '2026-01-01',
    description: 'Start date for invoice (ISO format)',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({
    example: '2026-01-31',
    description: 'End date for invoice (ISO format)',
  })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;
}
