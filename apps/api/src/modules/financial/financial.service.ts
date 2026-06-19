import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionStatus, TransactionType, tenantLocalStorage } from '@pipevitta/database';

@Injectable()
export class FinancialService {
  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreateTransactionDto, createdById: string): Promise<any> {
    const tenantId = tenantLocalStorage.getStore()?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Contexto do inquilino ausente');
    }

    // 1. If associated to a patient, validate existence
    if (dto.patientId) {
      const patient = await this.db.client.patient.findUnique({
        where: { id: dto.patientId },
      });
      if (!patient) {
        throw new NotFoundException('Paciente não encontrado');
      }
    }

    // 2. If commission split is present, validate professional existence
    if (dto.professionalId) {
      const professional = await this.db.client.user.findUnique({
        where: { id: dto.professionalId },
      });
      if (!professional) {
        throw new NotFoundException('Profissional para comissão não encontrado');
      }
      if (!dto.commissionAmount || dto.commissionAmount > dto.amount) {
        throw new BadRequestException('O valor da comissão deve ser menor ou igual ao valor do lançamento');
      }
    }

    // 3. Create financial record
    return this.db.client.transaction.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        amount: dto.amount,
        type: dto.type,
        status: dto.status ?? TransactionStatus.PENDING,
        description: dto.description,
        createdById,
        commissionAmount: dto.commissionAmount,
        professionalId: dto.professionalId,
      },
      include: {
        patient: { select: { name: true } },
        professional: { select: { name: true } },
      },
    });
  }

  async findAll(): Promise<any[]> {
    return this.db.client.transaction.findMany({
      include: {
        patient: { select: { name: true } },
        professional: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<any> {
    const transaction = await this.db.client.transaction.findUnique({
      where: { id },
      include: {
        patient: { select: { name: true } },
        professional: { select: { name: true } },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Lançamento financeiro não encontrado');
    }

    return transaction;
  }

  async update(id: string, dto: UpdateTransactionDto): Promise<any> {
    await this.findOne(id); // Verify existence under active tenant

    return this.db.client.transaction.update({
      where: { id },
      data: {
        patientId: dto.patientId,
        amount: dto.amount,
        type: dto.type,
        status: dto.status,
        description: dto.description,
        commissionAmount: dto.commissionAmount,
        professionalId: dto.professionalId,
      },
      include: {
        patient: { select: { name: true } },
        professional: { select: { name: true } },
      },
    });
  }

  async remove(id: string): Promise<any> {
    await this.findOne(id); // Verify existence under active tenant
    return this.db.client.transaction.delete({
      where: { id },
    });
  }

  // Calculate global cash stats (total inflow, outflow, and net balance)
  async getCashSummary(): Promise<any> {
    const transactions = await this.db.client.transaction.findMany({
      where: { status: TransactionStatus.COMPLETED },
    });

    let totalInflow = 0;
    let totalOutflow = 0;

    for (const tx of transactions) {
      const value = Number(tx.amount);
      if (tx.type === TransactionType.INFLOW) {
        totalInflow += value;
      } else {
        totalOutflow += value;
      }
    }

    return {
      totalInflow: Number(totalInflow.toFixed(2)),
      totalOutflow: Number(totalOutflow.toFixed(2)),
      balance: Number((totalInflow - totalOutflow).toFixed(2)),
    };
  }

  // Calculate professional commission repasses aggregates
  async getCommissionsSummary(): Promise<any[]> {
    const commissionTransactions = await this.db.client.transaction.findMany({
      where: {
        status: TransactionStatus.COMPLETED,
        type: TransactionType.INFLOW,
        professionalId: { not: null },
        commissionAmount: { not: null },
      },
      include: {
        professional: { select: { name: true } },
      },
    });

    const groups: { [id: string]: { id: string; name: string; totalCommission: number; count: number } } = {};

    for (const tx of commissionTransactions) {
      const profId = tx.professionalId!;
      const profName = tx.professional?.name ?? 'Profissional Desconhecido';
      const commAmount = Number(tx.commissionAmount);

      if (!groups[profId]) {
        groups[profId] = {
          id: profId,
          name: profName,
          totalCommission: 0,
          count: 0,
        };
      }

      groups[profId].totalCommission += commAmount;
      groups[profId].count += 1;
    }

    return Object.values(groups).map((group) => ({
      ...group,
      totalCommission: Number(group.totalCommission.toFixed(2)),
    }));
  }
}
