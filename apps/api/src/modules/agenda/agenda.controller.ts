import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AgendaService } from './agenda.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProfilesGuard } from '../../common/guards/profiles.guard';
import { Profiles } from '../../common/decorators/profiles.decorator';
import { UserProfile } from '@pipevitta/database';

@Controller('agenda')
@UseGuards(JwtAuthGuard, ProfilesGuard)
export class AgendaController {
  constructor(private readonly agendaService: AgendaService) {}

  @Post()
  @Profiles(
    UserProfile.ADMIN,
    UserProfile.RECEPCIONISTA,
    UserProfile.PROFISSIONAL,
  )
  async create(
    @Body() createAppointmentDto: CreateAppointmentDto,
  ): Promise<any> {
    return this.agendaService.create(createAppointmentDto);
  }

  @Get()
  @Profiles(
    UserProfile.ADMIN,
    UserProfile.RECEPCIONISTA,
    UserProfile.PROFISSIONAL,
  )
  async findAll(): Promise<any[]> {
    return this.agendaService.findAll();
  }

  @Get(':id')
  @Profiles(
    UserProfile.ADMIN,
    UserProfile.RECEPCIONISTA,
    UserProfile.PROFISSIONAL,
  )
  async findOne(@Param('id') id: string): Promise<any> {
    return this.agendaService.findOne(id);
  }

  @Patch(':id')
  @Profiles(
    UserProfile.ADMIN,
    UserProfile.RECEPCIONISTA,
    UserProfile.PROFISSIONAL,
  )
  async update(
    @Param('id') id: string,
    @Body() updateAppointmentDto: UpdateAppointmentDto,
  ): Promise<any> {
    return this.agendaService.update(id, updateAppointmentDto);
  }

  @Delete(':id')
  @Profiles(UserProfile.ADMIN, UserProfile.RECEPCIONISTA)
  async remove(@Param('id') id: string): Promise<any> {
    return this.agendaService.remove(id);
  }
}
