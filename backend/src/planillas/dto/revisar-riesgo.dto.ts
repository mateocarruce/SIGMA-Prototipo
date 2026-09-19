import { IsBoolean, IsOptional } from 'class-validator';

export class RevisarRiesgoDto {
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
