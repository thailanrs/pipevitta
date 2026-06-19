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
import { PepService } from './pep.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { AddEvolutionDto } from './dto/add-evolution.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProfilesGuard } from '../../common/guards/profiles.guard';
import { Profiles } from '../../common/decorators/profiles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserProfile } from '@pipevitta/database';

@Controller('patients')
@UseGuards(JwtAuthGuard, ProfilesGuard)
export class PepController {
  constructor(private readonly pepService: PepService) {}

  @Post()
  @Profiles(
    UserProfile.ADMIN,
    UserProfile.RECEPCIONISTA,
    UserProfile.PROFISSIONAL,
  )
  async create(@Body() createPatientDto: CreatePatientDto): Promise<any> {
    return this.pepService.create(createPatientDto);
  }

  @Get()
  @Profiles(
    UserProfile.ADMIN,
    UserProfile.RECEPCIONISTA,
    UserProfile.PROFISSIONAL,
  )
  async findAll(): Promise<any[]> {
    return this.pepService.findAll();
  }

  @Get(':id')
  @Profiles(
    UserProfile.ADMIN,
    UserProfile.RECEPCIONISTA,
    UserProfile.PROFISSIONAL,
  )
  async findOne(@Param('id') id: string): Promise<any> {
    return this.pepService.findOne(id);
  }

  @Patch(':id')
  @Profiles(
    UserProfile.ADMIN,
    UserProfile.RECEPCIONISTA,
    UserProfile.PROFISSIONAL,
  )
  async update(
    @Param('id') id: string,
    @Body() updatePatientDto: UpdatePatientDto,
  ): Promise<any> {
    return this.pepService.update(id, updatePatientDto);
  }

  @Delete(':id')
  @Profiles(UserProfile.ADMIN)
  async remove(@Param('id') id: string): Promise<any> {
    return this.pepService.remove(id);
  }

  // Restrict Clinical Evolutions writing exclusively to ADMIN and PROFISSIONAL roles
  @Post(':id/evolutions')
  @Profiles(UserProfile.ADMIN, UserProfile.PROFISSIONAL)
  async addEvolution(
    @Param('id') id: string,
    @Body() addEvolutionDto: AddEvolutionDto,
    @CurrentUser('name') professionalName: string,
  ): Promise<any> {
    return this.pepService.addEvolution(
      id,
      addEvolutionDto.content,
      professionalName,
    );
  }
}
