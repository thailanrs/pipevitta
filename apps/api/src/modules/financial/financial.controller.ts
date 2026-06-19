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
import { FinancialService } from './financial.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProfilesGuard } from '../../common/guards/profiles.guard';
import { Profiles } from '../../common/decorators/profiles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserProfile } from '@pipevitta/database';

@Controller('financial')
@UseGuards(JwtAuthGuard, ProfilesGuard)
export class FinancialController {
  constructor(private readonly financialService: FinancialService) {}

  @Post()
  @Profiles(UserProfile.ADMIN, UserProfile.FINANCEIRO)
  async create(
    @Body() createTransactionDto: CreateTransactionDto,
    @CurrentUser('sub') userId: string,
  ): Promise<any> {
    return this.financialService.create(createTransactionDto, userId);
  }

  @Get()
  @Profiles(UserProfile.ADMIN, UserProfile.FINANCEIRO)
  async findAll(): Promise<any[]> {
    return this.financialService.findAll();
  }

  // Cash Flow Summary Endpoint
  @Get('summary')
  @Profiles(UserProfile.ADMIN, UserProfile.FINANCEIRO)
  async getSummary(): Promise<any> {
    return this.financialService.getCashSummary();
  }

  // Professional Commission Split Endpoint
  @Get('commissions')
  @Profiles(UserProfile.ADMIN, UserProfile.FINANCEIRO, UserProfile.PROFISSIONAL)
  async getCommissions(): Promise<any[]> {
    return this.financialService.getCommissionsSummary();
  }

  @Get(':id')
  @Profiles(UserProfile.ADMIN, UserProfile.FINANCEIRO)
  async findOne(@Param('id') id: string): Promise<any> {
    return this.financialService.findOne(id);
  }

  @Patch(':id')
  @Profiles(UserProfile.ADMIN, UserProfile.FINANCEIRO)
  async update(
    @Param('id') id: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
  ): Promise<any> {
    return this.financialService.update(id, updateTransactionDto);
  }

  @Delete(':id')
  @Profiles(UserProfile.ADMIN)
  async remove(@Param('id') id: string): Promise<any> {
    return this.financialService.remove(id);
  }
}
