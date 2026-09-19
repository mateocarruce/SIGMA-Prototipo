import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CorreccionesService } from './correcciones.service';
import { CorreccionesController } from './correcciones.controller';
import { CorreccionAutomatica } from '../entities/correccion-automatica.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CorreccionAutomatica])],
  controllers: [CorreccionesController],
  providers: [CorreccionesService],
})
export class CorreccionesModule {}
