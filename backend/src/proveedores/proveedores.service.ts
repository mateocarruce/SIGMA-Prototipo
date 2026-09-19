import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proveedor } from '../entities/proveedor.entity';

@Injectable()
export class ProveedoresService {
  constructor(
    @InjectRepository(Proveedor)
    private readonly proveedoresRepo: Repository<Proveedor>,
  ) {}

  findAll() {
    return this.proveedoresRepo.find({ order: { nombre: 'ASC' } });
  }
}
