import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { tenantLocalStorage } from '@pipevitta/database';

@Injectable()
export class CrmService {
  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreateLeadDto): Promise<any> {
    const tenantId = tenantLocalStorage.getStore()?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Contexto do inquilino ausente');
    }

    return this.db.client.lead.create({
      data: {
        tenantId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        procedure: dto.procedure,
        estimatedValue: dto.estimatedValue,
        status: dto.status,
        source: dto.source,
        probability: dto.probability,
        warningText: dto.warningText,
        notes: dto.notes,
        professionalId: dto.professionalId,
      },
      include: {
        professional: { select: { name: true } },
      },
    });
  }

  async findAll(): Promise<any[]> {
    return this.db.client.lead.findMany({
      include: {
        professional: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<any> {
    const lead = await this.db.client.lead.findUnique({
      where: { id },
      include: {
        professional: { select: { name: true } },
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead não encontrado');
    }

    return lead;
  }

  async update(id: string, dto: UpdateLeadDto): Promise<any> {
    await this.findOne(id); // Verify existence under active tenant (RLS)

    return this.db.client.lead.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        procedure: dto.procedure,
        estimatedValue: dto.estimatedValue,
        status: dto.status,
        source: dto.source,
        probability: dto.probability,
        warningText: dto.warningText,
        notes: dto.notes,
        professionalId: dto.professionalId,
      },
      include: {
        professional: { select: { name: true } },
      },
    });
  }

  async remove(id: string): Promise<any> {
    await this.findOne(id); // Verify existence under active tenant
    return this.db.client.lead.delete({
      where: { id },
    });
  }
}
