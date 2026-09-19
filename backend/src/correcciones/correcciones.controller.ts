import { Controller, Get, Query } from '@nestjs/common';
import { CorreccionesService } from './correcciones.service';

@Controller('correcciones')
export class CorreccionesController {
  constructor(private readonly correccionesService: CorreccionesService) {}

  @Get()
  findAll(@Query('q') q?: string) {
    return this.correccionesService.findAll(q);
  }
}
