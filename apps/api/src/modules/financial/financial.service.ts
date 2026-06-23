import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionStatus, tenantLocalStorage } from '@pipevitta/database';
import { TransactionType } from './dto/create-transaction.dto';

@Injectable()
export class FinancialService {
  constructor(private readonly db: DatabaseService) {}

  private async mapTransactions(transactions: any[]): Promise<any[]> {
    const professionalIds = new Set<string>();

    const txDetails = transactions.map((tx: any) => {
      const assetEntry = tx.entries.find(
        (e: any) => e.account?.type === 'ASSET',
      );
      let type = 'INFLOW';
      let amount = 0;

      if (assetEntry) {
        const debit = Number(assetEntry.debit);
        const credit = Number(assetEntry.credit);
        if (debit > 0) {
          type = 'INFLOW';
          amount = debit;
        } else if (credit > 0) {
          type = 'OUTFLOW';
          amount = credit;
        }
      } else {
        const revenueEntry = tx.entries.find(
          (e: any) => e.account?.type === 'REVENUE',
        );
        if (revenueEntry) {
          type = 'INFLOW';
          amount = Number(revenueEntry.credit);
        } else {
          const expenseEntry = tx.entries.find(
            (e: any) => e.account?.type === 'EXPENSE',
          );
          if (expenseEntry) {
            type = 'OUTFLOW';
            amount = Number(expenseEntry.debit);
          } else {
            amount = tx.entries.reduce(
              (sum: number, e: any) => sum + Number(e.debit),
              0,
            );
          }
        }
      }

      const liabilityEntry = tx.entries.find(
        (e: any) =>
          e.account?.type === 'LIABILITY' &&
          e.account?.name.startsWith('Comissão a Pagar - '),
      );
      let commissionAmount: number | null = null;
      let professionalId: string | null = null;

      if (liabilityEntry) {
        commissionAmount = Number(liabilityEntry.credit);
        professionalId = liabilityEntry.account.name
          .replace('Comissão a Pagar - ', '')
          .trim();
        if (professionalId) {
          professionalIds.add(professionalId);
        }
      }

      return {
        tx,
        amount,
        type,
        commissionAmount,
        professionalId,
      };
    });

    const professionalsMap = new Map<string, string>();
    if (professionalIds.size > 0) {
      const professionals = await this.db.client.user.findMany({
        where: { id: { in: Array.from(professionalIds) } },
        select: { id: true, name: true },
      });
      for (const p of professionals) {
        professionalsMap.set(p.id, p.name);
      }
    }

    return txDetails.map(
      ({ tx, amount, type, commissionAmount, professionalId }) => {
        let professional = null;
        if (professionalId) {
          professional = {
            name:
              professionalsMap.get(professionalId) ??
              'Profissional Desconhecido',
          };
        }

        const { entries, ...rest } = tx;

        return {
          ...rest,
          amount,
          type,
          commissionAmount,
          professionalId,
          professional,
          entries,
        };
      },
    );
  }

  async create(dto: CreateTransactionDto, createdById: string): Promise<any> {
    const tenantId = tenantLocalStorage.getStore()?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Contexto do inquilino ausente');
    }

    if (dto.patientId) {
      const patient = await this.db.client.patient.findUnique({
        where: { id: dto.patientId, deletedAt: null },
      });
      if (!patient) {
        throw new NotFoundException('Paciente não encontrado');
      }
    }

    if (dto.professionalId) {
      const professional = await this.db.client.user.findUnique({
        where: { id: dto.professionalId },
      });
      if (!professional) {
        throw new NotFoundException(
          'Profissional para comissão não encontrado',
        );
      }
      if (!dto.commissionAmount || dto.commissionAmount > dto.amount) {
        throw new BadRequestException(
          'O valor da comissão deve ser menor ou igual ao valor do lançamento',
        );
      }
    }

    const transaction = await this.db.client.$transaction(async (tx) => {
      const getOrCreateAccount = async (name: string, type: any) => {
        let acc = await tx.ledgerAccount.findFirst({
          where: { tenantId, type, name },
        });
        if (!acc) {
          acc = await tx.ledgerAccount.findFirst({
            where: {
              tenantId,
              type,
              name: { contains: name.split(' ')[0], mode: 'insensitive' },
            },
          });
        }
        if (!acc) {
          acc = await tx.ledgerAccount.create({
            data: { tenantId, name, type },
          });
        }
        return acc;
      };

      const newTx = await tx.transaction.create({
        data: {
          tenantId,
          patientId: dto.patientId,
          status: dto.status ?? TransactionStatus.PENDING,
          description: dto.description,
          createdById,
        },
      });

      const accountCaixa = await getOrCreateAccount('Caixa Geral', 'ASSET');
      const entriesData = [];

      if (dto.type === TransactionType.INFLOW) {
        const accountReceita = await getOrCreateAccount(
          'Receita de Serviços',
          'REVENUE',
        );

        entriesData.push({
          tenantId,
          transactionId: newTx.id,
          accountId: accountCaixa.id,
          debit: dto.amount,
          credit: 0,
        });
        entriesData.push({
          tenantId,
          transactionId: newTx.id,
          accountId: accountReceita.id,
          debit: 0,
          credit: dto.amount,
        });

        if (
          dto.professionalId &&
          dto.commissionAmount &&
          dto.commissionAmount > 0
        ) {
          const accountComissaoPagar = await getOrCreateAccount(
            'Comissão a Pagar - ' + dto.professionalId,
            'LIABILITY',
          );
          const accountDespesaComissao = await getOrCreateAccount(
            'Despesa de Comissão',
            'EXPENSE',
          );

          entriesData.push({
            tenantId,
            transactionId: newTx.id,
            accountId: accountDespesaComissao.id,
            debit: dto.commissionAmount,
            credit: 0,
          });
          entriesData.push({
            tenantId,
            transactionId: newTx.id,
            accountId: accountComissaoPagar.id,
            debit: 0,
            credit: dto.commissionAmount,
          });
        }
      } else {
        const accountDespesa = await getOrCreateAccount(
          'Despesa de Escritório',
          'EXPENSE',
        );

        entriesData.push({
          tenantId,
          transactionId: newTx.id,
          accountId: accountDespesa.id,
          debit: dto.amount,
          credit: 0,
        });
        entriesData.push({
          tenantId,
          transactionId: newTx.id,
          accountId: accountCaixa.id,
          debit: 0,
          credit: dto.amount,
        });
      }

      await tx.ledgerEntry.createMany({
        data: entriesData,
      });

      return newTx;
    });

    return this.findOne(transaction.id);
  }

  async findAll(): Promise<any[]> {
    const txs = await this.db.client.transaction.findMany({
      where: { deletedAt: null },
      include: {
        patient: { select: { name: true } },
        entries: {
          include: {
            account: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return this.mapTransactions(txs);
  }

  async findOne(id: string): Promise<any> {
    const tx = await this.db.client.transaction.findUnique({
      where: { id },
      include: {
        patient: { select: { name: true } },
        entries: {
          include: {
            account: true,
          },
        },
      },
    });

    if (!tx || tx.deletedAt !== null) {
      throw new NotFoundException('Lançamento financeiro não encontrado');
    }

    const mapped = await this.mapTransactions([tx]);
    return mapped[0];
  }

  async update(id: string, dto: UpdateTransactionDto): Promise<any> {
    const existingTx = await this.findOne(id);

    const tenantId = tenantLocalStorage.getStore()?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Contexto do inquilino ausente');
    }

    const finalAmount =
      dto.amount !== undefined ? dto.amount : existingTx.amount;
    const finalType = dto.type !== undefined ? dto.type : existingTx.type;
    const finalCommissionAmount =
      dto.commissionAmount !== undefined
        ? dto.commissionAmount
        : existingTx.commissionAmount;
    const finalProfessionalId =
      dto.professionalId !== undefined
        ? dto.professionalId
        : existingTx.professionalId;

    await this.db.client.$transaction(async (tx) => {
      await tx.transaction.update({
        where: { id },
        data: {
          patientId:
            dto.patientId !== undefined ? dto.patientId : existingTx.patientId,
          status: dto.status !== undefined ? dto.status : existingTx.status,
          description:
            dto.description !== undefined
              ? dto.description
              : existingTx.description,
        },
      });

      const getOrCreateAccount = async (name: string, type: any) => {
        let acc = await tx.ledgerAccount.findFirst({
          where: { tenantId, type, name },
        });
        if (!acc) {
          acc = await tx.ledgerAccount.findFirst({
            where: {
              tenantId,
              type,
              name: { contains: name.split(' ')[0], mode: 'insensitive' },
            },
          });
        }
        if (!acc) {
          acc = await tx.ledgerAccount.create({
            data: { tenantId, name, type },
          });
        }
        return acc;
      };

      if (
        dto.amount !== undefined ||
        dto.type !== undefined ||
        dto.commissionAmount !== undefined ||
        dto.professionalId !== undefined
      ) {
        await tx.ledgerEntry.deleteMany({
          where: { transactionId: id },
        });

        const accountCaixa = await getOrCreateAccount('Caixa Geral', 'ASSET');
        const entriesData = [];

        if (finalType === 'INFLOW') {
          const accountReceita = await getOrCreateAccount(
            'Receita de Serviços',
            'REVENUE',
          );

          entriesData.push({
            tenantId: id,
            transactionId: id,
            accountId: accountCaixa.id,
            debit: finalAmount,
            credit: 0,
          });
          entriesData.push({
            tenantId: id,
            transactionId: id,
            accountId: accountReceita.id,
            debit: 0,
            credit: finalAmount,
          });

          if (
            finalProfessionalId &&
            finalCommissionAmount &&
            finalCommissionAmount > 0
          ) {
            const accountComissaoPagar = await getOrCreateAccount(
              'Comissão a Pagar - ' + finalProfessionalId,
              'LIABILITY',
            );
            const accountDespesaComissao = await getOrCreateAccount(
              'Despesa de Comissão',
              'EXPENSE',
            );

            entriesData.push({
              tenantId: id,
              transactionId: id,
              accountId: accountDespesaComissao.id,
              debit: finalCommissionAmount,
              credit: 0,
            });
            entriesData.push({
              tenantId: id,
              transactionId: id,
              accountId: accountComissaoPagar.id,
              debit: 0,
              credit: finalCommissionAmount,
            });
          }
        } else {
          const accountDespesa = await getOrCreateAccount(
            'Despesa de Escritório',
            'EXPENSE',
          );

          entriesData.push({
            tenantId: id,
            transactionId: id,
            accountId: accountDespesa.id,
            debit: finalAmount,
            credit: 0,
          });
          entriesData.push({
            tenantId: id,
            transactionId: id,
            accountId: accountCaixa.id,
            debit: 0,
            credit: finalAmount,
          });
        }

        await tx.ledgerEntry.createMany({
          data: entriesData,
        });
      }
    });

    return this.findOne(id);
  }

  async remove(id: string): Promise<any> {
    await this.findOne(id);
    return this.db.client.transaction.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getCashSummary(): Promise<any> {
    const entries = await this.db.client.ledgerEntry.findMany({
      where: {
        transaction: {
          status: 'COMPLETED',
          deletedAt: null,
        },
        account: {
          type: 'ASSET',
        },
      },
    });

    let totalInflow = 0;
    let totalOutflow = 0;

    for (const entry of entries) {
      totalInflow += Number(entry.debit);
      totalOutflow += Number(entry.credit);
    }

    return {
      totalInflow: Number(totalInflow.toFixed(2)),
      totalOutflow: Number(totalOutflow.toFixed(2)),
      balance: Number((totalInflow - totalOutflow).toFixed(2)),
    };
  }

  async getCommissionsSummary(): Promise<any[]> {
    const accounts = await this.db.client.ledgerAccount.findMany({
      where: {
        type: 'LIABILITY',
        name: { startsWith: 'Comissão a Pagar - ' },
      },
      include: {
        entries: {
          where: {
            transaction: {
              status: 'COMPLETED',
              deletedAt: null,
            },
          },
        },
      },
    });

    const summaries = [];

    for (const acc of accounts) {
      const profId = acc.name.replace('Comissão a Pagar - ', '').trim();
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(profId)) {
        continue;
      }

      const professional = await this.db.client.user.findUnique({
        where: { id: profId },
        select: { name: true },
      });

      const profName = professional?.name ?? 'Profissional Desconhecido';
      const totalCommission = acc.entries.reduce(
        (sum, entry) => sum + Number(entry.credit),
        0,
      );
      const count = acc.entries.length;

      summaries.push({
        id: profId,
        name: profName,
        totalCommission: Number(totalCommission.toFixed(2)),
        count,
      });
    }

    return summaries;
  }
}
