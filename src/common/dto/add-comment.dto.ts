import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddCommentDto {
  @ApiProperty({
    example: 'Customer requested urgent delivery',
    description: 'Comment or note to add to the order',
  })
  @IsString()
  @IsNotEmpty()
  comment: string;
}
