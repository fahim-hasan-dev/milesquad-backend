import { Request, Response, NextFunction } from 'express'
import multer, { FileFilterCallback } from 'multer'
import ApiError from '../../errors/ApiError'
import { StatusCodes } from 'http-status-codes'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'
import { uploadToR2 } from '../../utils/s3.util'

type IFolderName =
  | 'image'
  | 'files'
  | 'images'
  | 'nidFront'
  | 'nidBack'
  | 'drivingLicense'
  | 'criminalReport'
  | 'pdfDocument'
  | 'deliveryProof'
  | 'vehicleInsurance'
  | 'vehicleDocuments'

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
  { name: 'pdfDocument', maxCount: 1 },
  { name: 'deliveryProof', maxCount: 5 },
  { name: 'vehicleInsurance', maxCount: 1 },
  { name: 'vehicleDocuments', maxCount: 10 },
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
        pdfDocument: ['application/pdf'],
        deliveryProof: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
        vehicleInsurance: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'],
        vehicleDocuments: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'],
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

        if (typeof req.body?.driverInfo === 'string') {
          try {
            req.body.driverInfo = JSON.parse(req.body.driverInfo);
          } catch (e) {
            // keep as-is if parsing fails
          }
        }

        if (req.body && typeof req.body === 'object') {
          for (const key of Object.keys(req.body)) {
            const match = key.match(/^driverInfo\[(.*?)\]$/) || key.match(/^driverInfo\.(.*?)$/);
            if (match) {
              const subKey = match[1];
              if (!req.body.driverInfo || typeof req.body.driverInfo !== 'object') {
                req.body.driverInfo = {};
              }
              req.body.driverInfo[subKey] = req.body[key];
              delete req.body[key];
            }
          }

          if (req.body.vehicleType) {
            if (!req.body.driverInfo || typeof req.body.driverInfo !== 'object') {
              req.body.driverInfo = {};
            }
            req.body.driverInfo.vehicleType = req.body.vehicleType;
            delete req.body.vehicleType;
          }
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
                const fullPath = path.join(
                  uploadsDir,
                  fieldName,
                  file.filename,
                );

                if (
                  ['image', 'images', 'nidFront', 'nidBack', 'drivingLicense', 'criminalReport', 'deliveryProof', 'vehicleInsurance', 'vehicleDocuments'].includes(
                    fieldName,
                  ) &&
                  file.mimetype.startsWith('image/')
                ) {
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
                    console.error(`Failed to optimize /${fieldName}/${file.filename}:`, err);
                  }
                }

                try {
                  const fileKey = `${fieldName}/${file.filename}`;
                  const r2Url = await uploadToR2(fullPath, fileKey, file.mimetype);

                  if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                  }

                  paths.push(r2Url);
                } catch (uploadError) {
                  console.error(`Failed to upload ${file.filename} to R2:`, uploadError);
                  paths.push(`/${fieldName}/${file.filename}`);
                }
              }),
            );

            processedFiles[fieldName] = maxCount > 1 ? paths : paths[0];
          }),
        );

        const rawDriverInfo = (typeof req.body.driverInfo === 'object' && req.body.driverInfo !== null)
          ? req.body.driverInfo
          : {};

        const driverInfo: Record<string, any> = {
          ...rawDriverInfo,
          ...(processedFiles.nidFront && { nidFront: processedFiles.nidFront }),
          ...(processedFiles.nidBack && { nidBack: processedFiles.nidBack }),
          ...(processedFiles.drivingLicense && { drivingLicense: processedFiles.drivingLicense }),
          ...(processedFiles.criminalReport && { criminalReport: processedFiles.criminalReport }),
          ...(processedFiles.vehicleInsurance && { vehicleInsurance: processedFiles.vehicleInsurance }),
          ...(processedFiles.vehicleDocuments && {
            vehicleDocuments: Array.isArray(processedFiles.vehicleDocuments)
              ? processedFiles.vehicleDocuments
              : [processedFiles.vehicleDocuments],
          }),
        };

        req.body = {
          ...req.body,
          ...(processedFiles.image && { image: processedFiles.image }),
          ...(processedFiles.files && { files: processedFiles.files }),
          ...(processedFiles.images && { images: processedFiles.images }),
          ...(processedFiles.pdfDocument && { pdfDocument: processedFiles.pdfDocument }),
          ...(processedFiles.deliveryProof && { deliveryProof: Array.isArray(processedFiles.deliveryProof) ? processedFiles.deliveryProof : [processedFiles.deliveryProof] }),
          ...(Object.keys(driverInfo).length > 0 && { driverInfo }),
        };

        next();
      } catch (err) {
        next(err);
      }
    });
  };
};
