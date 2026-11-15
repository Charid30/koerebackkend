import {
  Controller, Post, Delete, UseInterceptors, UploadedFile,
  BadRequestException, NotFoundException, Param, ParseIntPipe, Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role, TypePhotoOT } from '@prisma/client';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { unlink } from 'fs/promises';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../common/decorators/roles.decorator';

const DOSSIER = join(process.cwd(), 'uploads');

const storage = diskStorage({
  destination: DOSSIER,
  filename: (_, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${extname(file.originalname).toLowerCase()}`);
  },
});

const EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
const TYPES_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const fileFilter = (_: any, file: Express.Multer.File, cb: any) => {
  const extOk = EXTENSIONS.includes(extname(file.originalname).toLowerCase());
  if (extOk && TYPES_MIME.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestException('Format non supporté (jpg, png, webp ou pdf uniquement)'), false);
  }
};

const OPTIONS = { storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } };

// Rôles autorisés, alignés sur ceux qui peuvent créer ou traiter l'élément concerné
const ROLES_OT = [Role.ADMIN, Role.RESPONSABLE_MAINTENANCE, Role.MECANICIEN];
const ROLES_DI = [Role.ADMIN, Role.RESPONSABLE_PARC, Role.RESPONSABLE_MAINTENANCE, Role.MECANICIEN, Role.CHAUFFEUR];
const ROLES_INSPECTION = [Role.ADMIN, Role.RESPONSABLE_MAINTENANCE, Role.MECANICIEN, Role.CHAUFFEUR];
const ROLES_VEHICULE = [Role.ADMIN, Role.RESPONSABLE_PARC];

/** Supprime le fichier du disque sans bloquer si il a déjà disparu. */
async function effacerFichier(url: string | null | undefined) {
  if (!url?.startsWith('/uploads/')) return;
  await unlink(join(DOSSIER, url.slice('/uploads/'.length))).catch(() => undefined);
}

@Controller('upload')
export class UploadController {
  constructor(private prisma: PrismaService) {}

  private exiger(file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Fichier manquant');
    return `/uploads/${file.filename}`;
  }

  // ── Ordres de travail ──────────────────────────────────────────────────────
  @Post('ot/:id/photo')
  @Roles(...ROLES_OT)
  @UseInterceptors(FileInterceptor('file', OPTIONS))
  async uploadPhotoOt(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type?: string,
  ) {
    const url = this.exiger(file);
    const ot = await this.prisma.ordresTravail.findUnique({ where: { id } });
    if (!ot) { await effacerFichier(url); throw new NotFoundException(`OT #${id} introuvable`); }
    const typePhoto = Object.values(TypePhotoOT).includes(type as TypePhotoOT) ? (type as TypePhotoOT) : TypePhotoOT.AVANT;
    return this.prisma.otPhoto.create({ data: { otId: id, url, type: typePhoto } });
  }

  @Delete('ot/photo/:photoId')
  @Roles(Role.ADMIN, Role.RESPONSABLE_MAINTENANCE)
  async supprimerPhotoOt(@Param('photoId', ParseIntPipe) photoId: number) {
    const photo = await this.prisma.otPhoto.findUnique({ where: { id: photoId } });
    if (!photo) throw new NotFoundException('Photo introuvable');
    await this.prisma.otPhoto.delete({ where: { id: photoId } });
    await effacerFichier(photo.url);
    return { id: photoId };
  }

  // ── Signalements de panne ──────────────────────────────────────────────────
  @Post('di/:id/photo')
  @Roles(...ROLES_DI)
  @UseInterceptors(FileInterceptor('file', OPTIONS))
  async uploadPhotoDi(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const url = this.exiger(file);
    const di = await this.prisma.demandeIntervention.findUnique({ where: { id } });
    if (!di) { await effacerFichier(url); throw new NotFoundException(`Signalement #${id} introuvable`); }
    return this.prisma.diPhoto.create({ data: { diId: id, url } });
  }

  @Delete('di/photo/:photoId')
  @Roles(Role.ADMIN, Role.RESPONSABLE_PARC, Role.RESPONSABLE_MAINTENANCE)
  async supprimerPhotoDi(@Param('photoId', ParseIntPipe) photoId: number) {
    const photo = await this.prisma.diPhoto.findUnique({ where: { id: photoId } });
    if (!photo) throw new NotFoundException('Photo introuvable');
    await this.prisma.diPhoto.delete({ where: { id: photoId } });
    await effacerFichier(photo.url);
    return { id: photoId };
  }

  // ── Points de contrôle d'inspection ────────────────────────────────────────
  @Post('inspection-item/:id/photo')
  @Roles(...ROLES_INSPECTION)
  @UseInterceptors(FileInterceptor('file', OPTIONS))
  async uploadPhotoInspectionItem(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const url = this.exiger(file);
    const item = await this.prisma.inspectionItem.findUnique({ where: { id } });
    if (!item) { await effacerFichier(url); throw new NotFoundException('Point de contrôle introuvable'); }
    await effacerFichier(item.photoUrl);
    return this.prisma.inspectionItem.update({ where: { id }, data: { photoUrl: url } });
  }

  // ── Véhicules ──────────────────────────────────────────────────────────────
  @Post('vehicule/:id/photo')
  @Roles(...ROLES_VEHICULE)
  @UseInterceptors(FileInterceptor('file', OPTIONS))
  async uploadPhotoVehicule(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const url = this.exiger(file);
    const vehicule = await this.prisma.vehicule.findUnique({ where: { id } });
    if (!vehicule) { await effacerFichier(url); throw new NotFoundException(`Véhicule #${id} introuvable`); }
    if (file.mimetype === 'application/pdf') {
      await effacerFichier(url);
      throw new BadRequestException('La photo du véhicule doit être une image');
    }
    await effacerFichier(vehicule.photoUrl);
    return this.prisma.vehicule.update({ where: { id }, data: { photoUrl: url } });
  }
}
