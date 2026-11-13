import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePieceDto } from './dto/create-piece.dto';
import { MouvementStockDto } from './dto/mouvement-stock.dto';

@Injectable()
export class StocksService {
  constructor(private prisma: PrismaService) {}

  async findAllPieces(page = 1, limit = 20, enAlerte = false) {
    const skip = (page - 1) * limit;
    const where = enAlerte ? { quantiteDisponible: { lte: this.prisma.pieceStock.fields.quantiteMinimum } } : {};

    const [data, total] = await Promise.all([
      this.prisma.pieceStock.findMany({ where, skip, take: limit, orderBy: { designation: 'asc' } }),
      this.prisma.pieceStock.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findPiecesEnAlerte() {
    return this.prisma.$queryRaw`
      SELECT * FROM pieces_stock
      WHERE quantiteDisponible <= quantiteMinimum
      ORDER BY (quantiteDisponible - quantiteMinimum) ASC
    `;
  }

  async findOnePiece(id: number) {
    const piece = await this.prisma.pieceStock.findUnique({
      where: { id },
      include: { mouvements: { take: 20, orderBy: { createdAt: 'desc' } } },
    });
    if (!piece) throw new NotFoundException(`Pièce #${id} introuvable`);
    return piece;
  }

  async createPiece(dto: CreatePieceDto) {
    return this.prisma.pieceStock.create({ data: dto });
  }

  async updatePiece(id: number, dto: Partial<CreatePieceDto>) {
    const piece = await this.findOnePiece(id);
    return this.prisma.pieceStock.update({ where: { id: piece.id }, data: dto });
  }

  async removePiece(id: number) {
    const piece = await this.findOnePiece(id);
    await this.prisma.mouvementStock.deleteMany({ where: { pieceId: piece.id } });
    return this.prisma.pieceStock.delete({ where: { id: piece.id } });
  }

  async getMouvements(pieceId: number) {
    return this.prisma.mouvementStock.findMany({
      where: { pieceId },
      include: { agent: { select: { nom: true, prenom: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async enregistrerMouvement(dto: MouvementStockDto, agentId: number) {
    const piece = await this.findOnePiece(dto.pieceId);

    if (dto.typeMouvement === 'SORTIE' && piece.quantiteDisponible < dto.quantite) {
      throw new BadRequestException(`Stock insuffisant. Disponible: ${piece.quantiteDisponible}`);
    }

    const delta = dto.typeMouvement === 'ENTREE' ? dto.quantite : -dto.quantite;

    const [mouvement] = await this.prisma.$transaction([
      this.prisma.mouvementStock.create({
        data: { ...dto, agentId },
      }),
      this.prisma.pieceStock.update({
        where: { id: dto.pieceId },
        data: { quantiteDisponible: { increment: delta } },
      }),
    ]);

    return mouvement;
  }
}
