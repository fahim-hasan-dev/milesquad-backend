import { Request, Response, NextFunction } from 'express'
import multer, { FileFilterCallback } from 'multer'
import ApiError from '../../errors/ApiError'
import { StatusCodes } from 'http-status-codes'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'

type IFolderName =
  | 'image'
  | 'media'
  | 'documents'
  | 'logo'
  | 'lostImage'
  | 'shippingLabel'

interface ProcessedFiles {
  [key: string]: string | string[] | undefined
}

const uploadFields = [
  { name: 'image', maxCount: 1 },
  { name: 'media', maxCount: 3 },
  { name: 'documents', maxCount: 3 },
  { name: 'logo', maxCount: 1 },
  { name: 'lostImage', maxCount: 4 },
  { name: 'shippingLabel', maxCount: 1 },
] as const

export const fileAndBodyProcessorUsingDiskStorage = () => {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const folderPath = path.join(uploadsDir, file.fieldname);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
      cb(null, folderPath);
    },
    filename: (req, file, cb) => {
      const extension =
        path.extname(file.originalname) || `.${file.mimetype.split('/')[1]}`;
      const filename = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}${extension}`;
      cb(null, filename);
    },
  });

  const fileFilter = (
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback,
  ) => {
    try {
      const allowedTypes = {
        image: ['image/jpeg', 'image/png', 'image/jpg'],
        media: ['video/mp4', 'audio/mpeg'],
        documents: ['application/pdf'],
        logo: ['image/jpeg', 'image/png', 'image/jpg'],
        lostImage: ['image/jpeg', 'image/png', 'image/jpg'],
        shippingLabel: [
          'image/jpeg',
          'image/png',
          'image/jpg',
          'application/pdf',
        ],
      };

      const fieldType = file.fieldname as IFolderName;
      if (!allowedTypes[fieldType]?.includes(file.mimetype)) {
        return cb(
          new ApiError(
            StatusCodes.BAD_REQUEST,
            `Invalid file type for ${file.fieldname}`,
          ),
        );
      }
      cb(null, true);
    } catch (error) {
      cb(
        new ApiError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          'File validation failed',
        ),
      );
    }
  };

  const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024, files: 50 },
  }).fields(uploadFields);

  return (req: Request, res: Response, next: NextFunction) => {
    upload(req, res, async (error) => {
      if (error) return next(error);

      try {
        if (req.body?.data) {
          req.body = JSON.parse(req.body.data);
        }

        if (!req.files) {
          return next();
        }

        const processedFiles: ProcessedFiles = {};
        const fieldsConfig = new Map(
          uploadFields.map((f) => [f.name, f.maxCount]),
        );

        await Promise.all(
          Object.entries(req.files).map(async ([fieldName, files]) => {
            const fileArray = files as Express.Multer.File[];
            const maxCount = fieldsConfig.get(fieldName as IFolderName) ?? 1;
            const paths: string[] = [];

            await Promise.all(
              fileArray.map(async (file) => {
                const filePath = `/${fieldName}/${file.filename}`;
                paths.push(filePath);

                if (
                  ['image', 'logo', 'lostImage', 'shippingLabel'].includes(
                    fieldName,
                  ) &&
                  file.mimetype.startsWith('image/')
                ) {
                  const fullPath = path.join(
                    uploadsDir,
                    fieldName,
                    file.filename,
                  );
                  const tempPath = fullPath + '.opt';

                  try {
                    let sharpInstance = sharp(fullPath)
                      .rotate()
                      .resize(800, null, { withoutEnlargement: true });

                    if (file.mimetype === 'image/png') {
                      sharpInstance = sharpInstance.png({ quality: 80 });
                    } else {
                      sharpInstance = sharpInstance.jpeg({
                        quality: 80,
                        mozjpeg: true,
                      });
                    }

                    await sharpInstance.toFile(tempPath);
                    fs.unlinkSync(fullPath);
                    fs.renameSync(tempPath, fullPath);
                  } catch (err) {
                    console.error(`Failed to optimize ${filePath}:`, err);
                  }
                }
              }),
            );

            processedFiles[fieldName] = maxCount > 1 ? paths : paths[0];
          }),
        );

        req.body = {
          ...req.body,
          ...(processedFiles.logo && { logo: processedFiles.logo }),
          ...(processedFiles.image && { image: processedFiles.image }),
          ...(processedFiles.shippingLabel && {
            shippingLabel: processedFiles.shippingLabel,
          }),
          ...(processedFiles.lostImage && {
            images: processedFiles.lostImage,
          }),
        };

        next();
      } catch (err) {
        next(err);
      }
    });
  };
};
