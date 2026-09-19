import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogoService } from './catalogo.service';
import { CatalogoController } from './catalogo.controller';
import { CatalogoTarifa } from '../entities/catalogo-tarifa.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CatalogoTarifa])],
  controllers: [CatalogoController],
  providers: [CatalogoService],
})
export class CatalogoModule {}
