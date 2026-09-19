import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PlanillasService } from './planillas.service';
import { CreatePlanillaDto } from './dto/create-planilla.dto';
import { RevisarRiesgoDto } from './dto/revisar-riesgo.dto';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  JwtUser,
} from '../common/decorators/current-user.decorator';

@Controller('planillas')
export class PlanillasController {
  constructor(private readonly planillasService: PlanillasService) {}

  @Get()
  findAll(@Query('estado') estado?: string) {
    return this.planillasService.findAll(estado);
  }

  @Roles('ADMIN', 'DIGITADOR')
  @Post()
  create(@Body() dto: CreatePlanillaDto, @CurrentUser() user: JwtUser) {
    return this.planillasService.create(dto, user.sub);
  }

  @Roles('ADMIN', 'DIGITADOR')
  @Post(':id/cargar-archivo')
  @UseInterceptors(FileInterceptor('archivo'))
  cargarArchivo(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() archivo: Express.Multer.File,
  ) {
    return this.planillasService.cargarArchivo(id, archivo);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.planillasService.findOne(id);
  }

  @Get(':id/detalles')
  findDetalles(@Param('id', ParseUUIDPipe) id: string) {
    return this.planillasService.findDetalles(id);
  }

  @Roles('ADMIN', 'AUDITOR')
  @Post(':id/revisar-riesgo')
  revisarRiesgo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RevisarRiesgoDto,
  ) {
    return this.planillasService.revisarRiesgo(id, dto.dryRun === true);
  }

  @Get(':id/correcciones')
  correcciones(@Param('id', ParseUUIDPipe) id: string) {
    return this.planillasService.correccionesDePlanilla(id);
  }

  @Get(':id/consolidado')
  consolidado(@Param('id', ParseUUIDPipe) id: string) {
    return this.planillasService.consolidado(id);
  }
}
