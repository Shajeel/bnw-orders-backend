import { IsArray, ValidateNested, IsString, IsOptional, IsMongoId, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProductDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Product ID in the PO',
  })
  @IsString()
  productId: string;

  @ApiProperty({
    example: 10,
    description: 'Quantity to order',
    required: false,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @ApiProperty({
    example: 50000,
    description: 'Unit price',
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  unitPrice?: number;

  @ApiProperty({
    example: 'SN123456789',
    description: 'Serial number for this product',
    required: false,
  })
  @IsString()
  @IsOptional()
  serialNumber?: string;
}

export class UpdatePurchaseOrderDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Vendor MongoDB ObjectId',
    required: false,
  })
  @IsMongoId()
  @IsOptional()
  vendorId?: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Bank Order ID reference',
    required: false,
  })
  @IsMongoId()
  @IsOptional()
  bankOrderId?: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'BIP Order ID reference',
    required: false,
  })
  @IsMongoId()
  @IsOptional()
  bipOrderId?: string;

  @ApiProperty({
    type: [UpdateProductDto],
    description: 'Array of products with their details',
    required: false,
    example: [
      { productId: '507f1f77bcf86cd799439011', quantity: 10, unitPrice: 50000, serialNumber: 'SN123456789' },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateProductDto)
  @IsOptional()
  products?: UpdateProductDto[];

  @ApiProperty({
    example: 'Special handling required',
    description: 'Notes or additional information',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
