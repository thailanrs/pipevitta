import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { TransactionStatus } from '@prisma/client';

export enum TransactionType {
  INFLOW = 'INFLOW',
  OUTFLOW = 'OUTFLOW',
}

export class UpdateTransactionDto {
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  commissionAmount?: number;

  @IsOptional()
  @IsUUID()
  professionalId?: string;
}
