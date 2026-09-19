import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { DetallesService } from './detalles.service';

@Controller('detalles')
export class DetallesController {
  constructor(private readonly detallesService: DetallesService) {}

  @Get(':id/individual')
  individual(@Param('id', ParseUUIDPipe) id: string) {
    return this.detallesService.individual(id);
  }
}
