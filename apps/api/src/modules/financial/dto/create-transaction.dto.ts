import {
  IsEnum,
  IsNotEmpty,
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

export class CreateTransactionDto {
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsNotEmpty()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'O valor deve ser numérico com no máximo 2 casas decimais' },
  )
  @Min(0.01, { message: 'O valor do lançamento deve ser maior que zero' })
  amount: number;

  @IsNotEmpty()
  @IsEnum(TransactionType)
  type: TransactionType;

  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  commissionAmount?: number;

  @IsOptional()
  @IsUUID()
  professionalId?: string;
}
