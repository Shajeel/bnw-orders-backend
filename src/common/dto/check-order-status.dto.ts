import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckOrderStatusDto {
  @ApiProperty({
    example: 'REF-2024-001',
    description: 'PO Number (refNo for bank orders or eforms for BIP orders)',
  })
  @IsString()
  @IsNotEmpty()
  poNumber: string;

  @ApiProperty({
    example: '1234567890123',
    description: 'Customer CNIC number',
  })
  @IsString()
  @IsNotEmpty()
  cnic: string;
}
