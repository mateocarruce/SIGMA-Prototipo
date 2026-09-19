import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { PlanillasModule } from './planillas/planillas.module';
import { DetallesModule } from './detalles/detalles.module';
import { CorreccionesModule } from './correcciones/correcciones.module';
import { CatalogoModule } from './catalogo/catalogo.module';
import { ProveedoresModule } from './proveedores/proveedores.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { Usuario } from './entities/usuario.entity';
import { Proveedor } from './entities/proveedor.entity';
import { CatalogoTarifa } from './entities/catalogo-tarifa.entity';
import { Planilla } from './entities/planilla.entity';
import { DetalleServicio } from './entities/detalle-servicio.entity';
import { CorreccionAutomatica } from './entities/correccion-automatica.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('POSTGRES_HOST'),
        port: configService.get<number>('POSTGRES_PORT'),
        username: configService.get<string>('POSTGRES_USER'),
        password: configService.get<string>('POSTGRES_PASSWORD'),
        database: configService.get<string>('POSTGRES_DB'),
        entities: [
          Usuario,
          Proveedor,
          CatalogoTarifa,
          Planilla,
          DetalleServicio,
          CorreccionAutomatica,
        ],
        synchronize: false,
      }),
    }),
    AuthModule,
    PlanillasModule,
    DetallesModule,
    CorreccionesModule,
    CatalogoModule,
    ProveedoresModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
