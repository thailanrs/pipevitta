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
import { CrmService } from './crm.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProfilesGuard } from '../../common/guards/profiles.guard';
import { Profiles } from '../../common/decorators/profiles.decorator';
import { UserProfile } from '@pipevitta/database';

@Controller('crm')
@UseGuards(JwtAuthGuard, ProfilesGuard)
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Post()
  @Profiles(
    UserProfile.ADMIN,
    UserProfile.RECEPCIONISTA,
    UserProfile.PROFISSIONAL,
    UserProfile.GESTOR_RELACIONAMENTO,
  )
  async create(@Body() createLeadDto: CreateLeadDto): Promise<any> {
    return this.crmService.create(createLeadDto);
  }

  @Get()
  @Profiles(
    UserProfile.ADMIN,
    UserProfile.RECEPCIONISTA,
    UserProfile.PROFISSIONAL,
    UserProfile.GESTOR_RELACIONAMENTO,
  )
  async findAll(): Promise<any[]> {
    return this.crmService.findAll();
  }

  @Get(':id')
  @Profiles(
    UserProfile.ADMIN,
    UserProfile.RECEPCIONISTA,
    UserProfile.PROFISSIONAL,
    UserProfile.GESTOR_RELACIONAMENTO,
  )
  async findOne(@Param('id') id: string): Promise<any> {
    return this.crmService.findOne(id);
  }

  @Patch(':id')
  @Profiles(
    UserProfile.ADMIN,
    UserProfile.RECEPCIONISTA,
    UserProfile.PROFISSIONAL,
    UserProfile.GESTOR_RELACIONAMENTO,
  )
  async update(
    @Param('id') id: string,
    @Body() updateLeadDto: UpdateLeadDto,
  ): Promise<any> {
    return this.crmService.update(id, updateLeadDto);
  }

  @Delete(':id')
  @Profiles(UserProfile.ADMIN, UserProfile.GESTOR_RELACIONAMENTO)
  async remove(@Param('id') id: string): Promise<any> {
    return this.crmService.remove(id);
  }
}
