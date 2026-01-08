import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckBipOrderStatusDto {
  @ApiProperty({
    example: 'EFORM-2024-001',
    description: 'E-Form number for BIP orders',
  })
  @IsString()
  @IsNotEmpty()
  eforms: string;

  @ApiProperty({
    example: '1234567890123',
    description: 'Customer CNIC number',
  })
  @IsString()
  @IsNotEmpty()
  cnic: string;
}
