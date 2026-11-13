import {
  Controller, Post, UseInterceptors, UploadedFile,
  BadRequestException, Param, ParseIntPipe, Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { PrismaService } from '../prisma/prisma.service';

const storage = diskStorage({
  destination: join(process.cwd(), 'uploads'),
  filename: (_, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${extname(file.originalname)}`);
  },
});

const fileFilter = (_: any, file: Express.Multer.File, cb: any) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
  if (allowed.includes(extname(file.originalname).toLowerCase())) {
    cb(null, true);
  } else {
    cb(new BadRequestException('Format non supporté (jpg, png, webp, pdf uniquement)'), false);
  }
};

@Controller('upload')
export class UploadController {
  constructor(private prisma: PrismaService) {}

  @Post('ot/:id/photo')
  @UseInterceptors(FileInterceptor('file', { storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadPhotoOt(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: string,
  ) {
    if (!file) throw new BadRequestException('Fichier manquant');
    const url = `/uploads/${file.filename}`;
    return this.prisma.otPhoto.create({
      data: { otId: id, url, type: (type ?? 'AVANT') as any },
    });
  }

  @Post('di/:id/photo')
  @UseInterceptors(FileInterceptor('file', { storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadPhotoDi(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Fichier manquant');
    const url = `/uploads/${file.filename}`;
    return this.prisma.diPhoto.create({ data: { diId: id, url } });
  }

  @Post('vehicule/:id/photo')
  @UseInterceptors(FileInterceptor('file', { storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadPhotoVehicule(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Fichier manquant');
    const url = `/uploads/${file.filename}`;
    return this.prisma.vehicule.update({ where: { id }, data: { photoUrl: url } });
  }
}
