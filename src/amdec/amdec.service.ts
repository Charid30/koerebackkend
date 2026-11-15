import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAmdecDto } from './dto/create-amdec.dto';

@Injectable()
export class AmdecService {
  constructor(private prisma: PrismaService) {}

  private calculerIPR(frequence: number, gravite: number, detectabilite: number): number {
    return frequence * gravite * detectabilite;
  }

  private getNiveauRisque(ipr: number): string {
    if (ipr <= 15) return 'FAIBLE';
    if (ipr <= 40) return 'MOYEN';
    if (ipr <= 75) return 'ELEVE';
    return 'CRITIQUE';
  }

  async findByVehicule(vehiculeId: number) {
    return this.prisma.amdecAnalyse.findMany({
      where: { vehiculeId },
      orderBy: { ipr: 'desc' },
    });
  }

  async create(dto: CreateAmdecDto) {
    const { frequence, gravite, detectabilite } = dto;

    if (![frequence, gravite, detectabilite].every((v) => v >= 1 && v <= 5)) {
      throw new BadRequestException('Fréquence, Gravité et Détectabilité doivent être entre 1 et 5');
    }

    const ipr = this.calculerIPR(frequence, gravite, detectabilite);

    return this.prisma.amdecAnalyse.create({
      data: { ...dto, ipr },
    });
  }

  async update(id: number, dto: Partial<CreateAmdecDto>) {
    const analyse = await this.prisma.amdecAnalyse.findUnique({ where: { id } });
    if (!analyse) throw new NotFoundException(`Analyse AMDEC #${id} introuvable`);

    const frequence = dto.frequence ?? analyse.frequence;
    const gravite = dto.gravite ?? analyse.gravite;
    const detectabilite = dto.detectabilite ?? analyse.detectabilite;
    const ipr = this.calculerIPR(frequence, gravite, detectabilite);

    return this.prisma.amdecAnalyse.update({
      where: { id },
      data: { ...dto, ipr },
    });
  }

  async remove(id: number) {
    const analyse = await this.prisma.amdecAnalyse.findUnique({ where: { id } });
    if (!analyse) throw new NotFoundException(`Analyse AMDEC #${id} introuvable`);
    return this.prisma.amdecAnalyse.delete({ where: { id } });
  }

  async getMatriceCriticite(vehiculeId: number) {
    const analyses = await this.findByVehicule(vehiculeId);
    return analyses.map((a) => ({
      ...a,
      niveauRisque: this.getNiveauRisque(a.ipr),
    }));
  }
}
