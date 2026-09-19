import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DetallesService } from './detalles.service';
import { DetallesController } from './detalles.controller';
import { DetalleServicio } from '../entities/detalle-servicio.entity';
import { CorreccionAutomatica } from '../entities/correccion-automatica.entity';
import { Planilla } from '../entities/planilla.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DetalleServicio, CorreccionAutomatica, Planilla]),
  ],
  controllers: [DetallesController],
  providers: [DetallesService],
})
export class DetallesModule {}
