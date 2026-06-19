import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { tenantLocalStorage } from '@pipevitta/database';

export interface ClinicalEvolution {
  date: string;
  professionalName: string;
  content: string;
}

@Injectable()
export class PepService {
  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreatePatientDto): Promise<any> {
    const tenantId = tenantLocalStorage.getStore()?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Contexto do inquilino ausente');
    }

    // Check if patient with same CPF already exists under the active tenant
    const existing = await this.db.client.patient.findFirst({
      where: { cpf: dto.cpf },
    });

    if (existing) {
      throw new ConflictException('Já existe um paciente cadastrado com este CPF nesta clínica');
    }

    return this.db.client.patient.create({
      data: {
        tenantId,
        name: dto.name,
        cpf: dto.cpf,
        email: dto.email,
        phone: dto.phone,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        notes: dto.notes,
        clinicalHistory: dto.clinicalHistory ?? '[]', // Start with empty JSON array for evolution history
      },
    });
  }

  async findAll(): Promise<any[]> {
    return this.db.client.patient.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string): Promise<any> {
    const patient = await this.db.client.patient.findUnique({
      where: { id },
      include: {
        appointments: {
          orderBy: { startTime: 'desc' },
          select: {
            id: true,
            startTime: true,
            endTime: true,
            status: true,
            professional: { select: { name: true } },
          },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            amount: true,
            type: true,
            status: true,
            description: true,
            createdAt: true,
          },
        },
      },
    });

    if (!patient) {
      throw new NotFoundException('Paciente não encontrado');
    }

    return patient;
  }

  async update(id: string, dto: UpdatePatientDto): Promise<any> {
    await this.findOne(id); // Verify existence under active tenant (RLS)

    if (dto.cpf) {
      const conflict = await this.db.client.patient.findFirst({
        where: { cpf: dto.cpf, id: { not: id } },
      });
      if (conflict) {
        throw new ConflictException('Outro paciente já está cadastrado com este CPF nesta clínica');
      }
    }

    return this.db.client.patient.update({
      where: { id },
      data: {
        name: dto.name,
        cpf: dto.cpf,
        email: dto.email,
        phone: dto.phone,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        notes: dto.notes,
        clinicalHistory: dto.clinicalHistory,
      },
    });
  }

  async remove(id: string): Promise<any> {
    await this.findOne(id); // Verify existence under active tenant
    return this.db.client.patient.delete({
      where: { id },
    });
  }

  // Add a clinical evolution entry to the patient's timeline history
  async addEvolution(patientId: string, content: string, professionalName: string): Promise<any> {
    const patient = await this.findOne(patientId);

    let timeline: ClinicalEvolution[] = [];
    try {
      timeline = JSON.parse(patient.clinicalHistory || '[]');
      if (!Array.isArray(timeline)) {
        timeline = [];
      }
    } catch {
      timeline = [];
    }

    // Append new evolution entry
    const newEntry: ClinicalEvolution = {
      date: new Date().toISOString(),
      professionalName,
      content,
    };

    timeline.unshift(newEntry); // Newest entries first

    return this.db.client.patient.update({
      where: { id: patientId },
      data: {
        clinicalHistory: JSON.stringify(timeline),
      },
    });
  }
}
