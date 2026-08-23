import { Request, Response, NextFunction } from 'express'
import multer, { FileFilterCallback } from 'multer'
import ApiError from '../../errors/ApiError'
import { StatusCodes } from 'http-status-codes'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'

type IFolderName =
  | 'image'
  | 'files'
  | 'images'
  | 'nidFront'
  | 'nidBack'
  | 'drivingLicense'
  | 'criminalReport'

interface ProcessedFiles {
  [key: string]: string | string[] | undefined
}

const uploadFields = [
  { name: 'image', maxCount: 1 },
  { name: 'files', maxCount: 5 },
  { name: 'images', maxCount: 5 },
  { name: 'nidFront', maxCount: 1 },
  { name: 'nidBack', maxCount: 1 },
  { name: 'drivingLicense', maxCount: 1 },
  { name: 'criminalReport', maxCount: 1 },
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
      const allowedTypes: Record<IFolderName, string[]> = {
        image: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
        files: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'video/mp4', 'audio/mpeg', 'audio/mp3', 'application/pdf'],
        images: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
        nidFront: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'],
        nidBack: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'],
        drivingLicense: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'],
        criminalReport: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'],
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
    limits: { fileSize: 15 * 1024 * 1024, files: 50 },
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
                  ['image', 'images', 'nidFront', 'nidBack', 'drivingLicense', 'criminalReport'].includes(
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
                      .resize(1200, null, { withoutEnlargement: true });

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

        const driverInfo: Record<string, any> = {
          ...(req.body.driverInfo || {}),
          ...(processedFiles.nidFront && { nidFront: processedFiles.nidFront }),
          ...(processedFiles.nidBack && { nidBack: processedFiles.nidBack }),
          ...(processedFiles.drivingLicense && { drivingLicense: processedFiles.drivingLicense }),
          ...(processedFiles.criminalReport && { criminalReport: processedFiles.criminalReport }),
        };

        req.body = {
          ...req.body,
          ...(processedFiles.image && { image: processedFiles.image }),
          ...(processedFiles.files && { files: processedFiles.files }),
          ...(processedFiles.images && { images: processedFiles.images }),
          ...(Object.keys(driverInfo).length > 0 && { driverInfo }),
        };

        next();
      } catch (err) {
        next(err);
      }
    });
  };
};
