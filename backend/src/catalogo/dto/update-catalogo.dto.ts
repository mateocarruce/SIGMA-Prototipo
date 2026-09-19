import { IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

// No se usa PartialType (@nestjs/mapped-types) a propósito para no agregar una
// dependencia nueva al proyecto — se define explícitamente con todos los campos
// opcionales, igual de válido para este caso.
export class UpdateCatalogoDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  codigo_tpsns?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  descripcion?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  valor_oficial?: number;

  @IsOptional()
  @IsString()
  tipo_procedimiento?: string;

  @IsOptional()
  @IsString()
  nivel?: string;
}
