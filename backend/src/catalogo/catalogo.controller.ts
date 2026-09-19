import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CatalogoService } from './catalogo.service';
import { CreateCatalogoDto } from './dto/create-catalogo.dto';
import { UpdateCatalogoDto } from './dto/update-catalogo.dto';

// Sin @Roles(...) a propósito: cualquier usuario autenticado (ADMIN, AUDITOR o
// DIGITADOR) puede ver, cargar y editar el catálogo — decisión explícita del
// usuario del sistema, distinta del resto de módulos que sí restringen por rol.
@Controller('catalogo')
export class CatalogoController {
  constructor(private readonly catalogoService: CatalogoService) {}

  @Get()
  findAll(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.catalogoService.findAll(
      q,
      page ? parseInt(page, 10) : undefined,
      pageSize ? parseInt(pageSize, 10) : undefined,
    );
  }

  @Post('importar')
  @UseInterceptors(FileInterceptor('archivo'))
  importar(@UploadedFile() archivo: Express.Multer.File) {
    return this.catalogoService.importar(archivo);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogoService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCatalogoDto) {
    return this.catalogoService.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCatalogoDto) {
    return this.catalogoService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogoService.remove(id);
  }
}
