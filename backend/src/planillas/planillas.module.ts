import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { PlanillasService } from './planillas.service';
import { PlanillasController } from './planillas.controller';
import { Planilla } from '../entities/planilla.entity';
import { Proveedor } from '../entities/proveedor.entity';
import { DetalleServicio } from '../entities/detalle-servicio.entity';
import { CatalogoTarifa } from '../entities/catalogo-tarifa.entity';
import { CorreccionAutomatica } from '../entities/correccion-automatica.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Planilla,
      Proveedor,
      DetalleServicio,
      CatalogoTarifa,
      CorreccionAutomatica,
    ]),
    HttpModule.register({ timeout: 10000 }),
  ],
  controllers: [PlanillasController],
  providers: [PlanillasService],
  exports: [PlanillasService],
})
export class PlanillasModule {}
