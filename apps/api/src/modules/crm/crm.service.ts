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
        tags: dto.tags
          ? {
              create: dto.tags.map((name) => ({
                name,
                tenantId,
              })),
            }
          : undefined,
      },
      include: {
        professional: { select: { name: true } },
        tags: {
          where: { deletedAt: null },
          select: { name: true },
        },
      },
    });
  }

  async findAll(): Promise<any[]> {
    return this.db.client.lead.findMany({
      where: { deletedAt: null },
      include: {
        professional: { select: { name: true } },
        tags: {
          where: { deletedAt: null },
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<any> {
    const lead = await this.db.client.lead.findUnique({
      where: { id },
      include: {
        professional: { select: { name: true } },
        tags: {
          where: { deletedAt: null },
          select: { name: true },
        },
      },
    });

    if (!lead || lead.deletedAt !== null) {
      throw new NotFoundException('Lead não encontrado');
    }

    return lead;
  }

  async update(id: string, dto: UpdateLeadDto): Promise<any> {
    const lead = await this.findOne(id); // Verify existence under active tenant (RLS)
    const tenantId = lead.tenantId;

    if (dto.tags !== undefined) {
      // 1. Get all current tags (active and soft deleted)
      const existingTags = await this.db.client.leadTag.findMany({
        where: { leadId: id },
      });

      const newTags = dto.tags || [];

      // Tags to soft-delete (were active but not in new list)
      const tagsToSoftDelete = existingTags
        .filter((t) => t.deletedAt === null && !newTags.includes(t.name))
        .map((t) => t.name);

      // Tags to restore (were soft-deleted but are in new list)
      const tagsToRestore = existingTags
        .filter((t) => t.deletedAt !== null && newTags.includes(t.name))
        .map((t) => t.name);

      // Tags to create (do not exist at all in any state)
      const existingNames = existingTags.map((t) => t.name);
      const tagsToCreate = newTags.filter(
        (name) => !existingNames.includes(name),
      );

      // Perform updates
      if (tagsToSoftDelete.length > 0) {
        await this.db.client.leadTag.updateMany({
          where: { leadId: id, name: { in: tagsToSoftDelete } },
          data: { deletedAt: new Date() },
        });
      }

      if (tagsToRestore.length > 0) {
        await this.db.client.leadTag.updateMany({
          where: { leadId: id, name: { in: tagsToRestore } },
          data: { deletedAt: null },
        });
      }

      if (tagsToCreate.length > 0) {
        await this.db.client.leadTag.createMany({
          data: tagsToCreate.map((name) => ({
            leadId: id,
            tenantId,
            name,
          })),
        });
      }
    }

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
        tags: {
          where: { deletedAt: null },
          select: { name: true },
        },
      },
    });
  }

  async remove(id: string): Promise<any> {
    await this.findOne(id); // Verify existence under active tenant
    return this.db.client.lead.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
