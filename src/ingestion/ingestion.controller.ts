import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import {
  CreateIngestionProcessDto,
  IngestionProcessQueryDto,
} from '../dto/ingestion.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('ingestion')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  create(
    @Body() createIngestionDto: CreateIngestionProcessDto,
    @Request() req,
  ) {
    return this.ingestionService.createIngestionProcess(
      createIngestionDto,
      req.user,
    );
  }

  @Get()
  findAll(@Query() query: IngestionProcessQueryDto, @Request() req) {
    return this.ingestionService.findAll(query, req.user);
  }

  @Get('status/:id')
  getProcessStatus(@Param('id') id: string, @Request() req) {
    return this.ingestionService.findById(id, req.user);
  }

  @Post(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @HttpCode(HttpStatus.OK)
  cancelProcess(@Param('id') id: string, @Request() req) {
    return this.ingestionService.cancelProcess(id, req.user);
  }
}
