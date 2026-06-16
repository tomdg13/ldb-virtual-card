import { IsString, IsOptional, IsIn } from 'class-validator';

export class IssueCardDto {
  @IsString()
  cifNo: string;

  @IsString()
  fullName: string;

  @IsOptional()
  @IsString()
  phoneNo?: string;

  @IsString()
  productCode: string;

  @IsOptional()
  @IsIn(['UNIONPAY', 'VISA', 'MASTERCARD', 'LAPS'])
  cardScheme?: string;
}
