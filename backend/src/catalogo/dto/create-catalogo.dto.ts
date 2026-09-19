import { IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateCatalogoDto {
  @IsString()
  @MinLength(1)
  codigo_tpsns: string;

  @IsString()
  @MinLength(1)
  descripcion: string;

  @IsNumber()
  @Min(0)
  valor_oficial: number;

  @IsOptional()
  @IsString()
  tipo_procedimiento?: string;

  @IsOptional()
  @IsString()
  nivel?: string;
}
