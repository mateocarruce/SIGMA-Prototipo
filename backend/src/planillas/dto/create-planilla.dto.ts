import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreatePlanillaDto {
  @IsUUID()
  proveedor_id: string;

  @IsString()
  @IsNotEmpty()
  tipo_servicio: string;

  @IsString()
  @IsNotEmpty()
  mes_ano_prestacion: string;
}
