import { IsOptional, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum OrderType {
  ALL = 'all',
  BANK_ORDERS = 'bank_orders',
  BIP_ORDERS = 'bip_orders',
}

export class StatsQueryDto {
  @ApiProperty({
    example: '2024-01-01',
    description: 'Start date for filtering (ISO date format)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    example: '2024-01-31',
    description: 'End date for filtering (ISO date format)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    example: 'all',
    description: 'Order type filter',
    enum: OrderType,
    enumName: 'OrderType',
    required: false,
    default: OrderType.ALL,
  })
  @IsOptional()
  @IsEnum(OrderType)
  orderType?: OrderType = OrderType.ALL;
}
