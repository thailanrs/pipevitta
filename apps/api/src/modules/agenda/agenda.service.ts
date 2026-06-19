import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentStatus, tenantLocalStorage } from '@pipevitta/database';

@Injectable()
export class AgendaService {
  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreateAppointmentDto): Promise<any> {
    const tenantId = tenantLocalStorage.getStore()?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Contexto do inquilino ausente');
    }

    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    const buffer = dto.bufferMinutes ?? 0;

    if (start >= end) {
      throw new BadRequestException('A data de início deve ser anterior à data de término');
    }

    // 1. Validate professional exists
    const professional = await this.db.client.user.findUnique({
      where: { id: dto.professionalId },
    });
    if (!professional) {
      throw new NotFoundException('Profissional não encontrado');
    }

    // 2. Validate patient exists
    const patient = await this.db.client.patient.findUnique({
      where: { id: dto.patientId },
    });
    if (!patient) {
      throw new NotFoundException('Paciente não encontrado');
    }

    // 3. Check for resource conflicts (Professional / Room + Buffer times)
    await this.checkResourceConflicts(start, end, buffer, dto.professionalId, dto.room);

    // 4. Create appointment
    return this.db.client.appointment.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        professionalId: dto.professionalId,
        startTime: start,
        endTime: end,
        status: dto.status ?? AppointmentStatus.PENDING,
        room: dto.room,
        bufferMinutes: buffer,
        notes: dto.notes,
      },
      include: {
        patient: { select: { name: true, phone: true } },
        professional: { select: { name: true } },
      },
    });
  }

  async findAll(): Promise<any[]> {
    return this.db.client.appointment.findMany({
      include: {
        patient: { select: { name: true } },
        professional: { select: { name: true } },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async findOne(id: string): Promise<any> {
    const appointment = await this.db.client.appointment.findUnique({
      where: { id },
      include: {
        patient: { select: { name: true, phone: true } },
        professional: { select: { name: true } },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    return appointment;
  }

  async update(id: string, dto: UpdateAppointmentDto): Promise<any> {
    const existing = await this.findOne(id);

    const start = dto.startTime ? new Date(dto.startTime) : existing.startTime;
    const end = dto.endTime ? new Date(dto.endTime) : existing.endTime;
    const buffer = dto.bufferMinutes ?? existing.bufferMinutes;
    const professionalId = dto.professionalId ?? existing.professionalId;
    const room = dto.room !== undefined ? dto.room : existing.room;

    if (start >= end) {
      throw new BadRequestException('A data de início deve ser anterior à data de término');
    }

    // If changing time, professional, or room, check conflicts
    if (
      dto.startTime ||
      dto.endTime ||
      dto.bufferMinutes !== undefined ||
      dto.professionalId ||
      dto.room !== undefined
    ) {
      await this.checkResourceConflicts(start, end, buffer, professionalId, room, id);
    }

    return this.db.client.appointment.update({
      where: { id },
      data: {
        patientId: dto.patientId,
        professionalId,
        startTime: start,
        endTime: end,
        status: dto.status,
        room,
        bufferMinutes: buffer,
        notes: dto.notes,
      },
      include: {
        patient: { select: { name: true } },
        professional: { select: { name: true } },
      },
    });
  }

  async remove(id: string): Promise<any> {
    await this.findOne(id); // Ensure exists under tenant RLS
    return this.db.client.appointment.delete({
      where: { id },
    });
  }

  // Helper method to detect overlaps with professional or room availability (including buffer time)
  private async checkResourceConflicts(
    start: Date,
    end: Date,
    buffer: number,
    professionalId: string,
    room?: string,
    excludeAppointmentId?: string,
  ): Promise<void> {
    // Define a 24-hour search boundary around the target start time to optimize query size
    const dayStart = new Date(start.getTime() - 24 * 60 * 60 * 1000);
    const dayEnd = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    const candidates = await this.db.client.appointment.findMany({
      where: {
        id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
        status: { not: AppointmentStatus.CANCELLED },
        startTime: { gte: dayStart, lte: dayEnd },
        OR: [
          { professionalId },
          room ? { room } : undefined,
        ].filter(Boolean) as any,
      },
    });

    const newBlockedEnd = end.getTime() + buffer * 60 * 1000;

    for (const app of candidates) {
      const appBlockedEnd = app.endTime.getTime() + app.bufferMinutes * 60 * 1000;

      // Overlap formula: Start1 < End2 AND Start2 < End1
      const overlaps = start.getTime() < appBlockedEnd && app.startTime.getTime() < newBlockedEnd;

      if (overlaps) {
        if (app.professionalId === professionalId) {
          throw new ConflictException('O profissional já possui um agendamento conflitante neste horário (incluindo tempo de buffer)');
        }
        if (room && app.room === room) {
          throw new ConflictException('A sala de atendimento já está ocupada neste horário (incluindo tempo de buffer)');
        }
      }
    }
  }
}
