import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import config from '../config';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: config.r2.accessKeyId as string,
    secretAccessKey: config.r2.secretAccessKey as string,
  },
});

export const uploadToR2 = async (
  filePath: string,
  fileKey: string,
  mimeType: string
): Promise<string> => {
  const fileBuffer = fs.readFileSync(filePath);

  await s3Client.send(
    new PutObjectCommand({
      Bucket: config.r2.bucketName,
      Key: fileKey,
      Body: fileBuffer,
      ContentType: mimeType,
    })
  );

  return `${config.r2.publicUrl}/${fileKey}`;
};

export const deleteFromR2 = async (fileKeyOrUrl: string): Promise<void> => {
  if (!fileKeyOrUrl) return;

  let key = fileKeyOrUrl;

  // Extract the key if a full public URL was provided
  if (config.r2.publicUrl && fileKeyOrUrl.startsWith(config.r2.publicUrl)) {
    key = fileKeyOrUrl.replace(`${config.r2.publicUrl}/`, '');
  } else if (fileKeyOrUrl.startsWith('/')) {
    key = fileKeyOrUrl.substring(1);
  }

  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: config.r2.bucketName,
      Key: key,
    })
  );
};

/**
 * Recursively finds all R2 file URLs in an object (like a Mongoose document).
 */
const findR2Urls = (obj: any): string[] => {
  let urls: string[] = [];
  if (!obj || typeof obj !== 'object') return urls;

  for (const key in obj) {
    const value = obj[key];
    if (typeof value === 'string' && config.r2.publicUrl && value.startsWith(config.r2.publicUrl)) {
      urls.push(value);
    } else if (Array.isArray(value)) {
      value.forEach((item) => {
        urls = urls.concat(findR2Urls(item));
      });
    } else if (typeof value === 'object') {
      urls = urls.concat(findR2Urls(value));
    }
  }
  return urls;
};

export const deleteReplacedFiles = async (oldData: any, newData: any) => {
  const oldUrls = findR2Urls(oldData);
  // We stringify and parse to handle Mongoose documents and complex objects
  const newUrls = findR2Urls(JSON.parse(JSON.stringify(newData)));

  // Find URLs that exist in the old data but not in the new data
  const urlsToDelete = oldUrls.filter(url => !newUrls.includes(url));

  // Delete them from R2 in parallel
  await Promise.all(
    urlsToDelete.map(url => deleteFromR2(url).catch(err => console.error(`Failed to delete ${url}:`, err)))
  );
};

export const deleteAllFiles = async (data: any) => {
  const urls = findR2Urls(data);
  
  await Promise.all(
    urls.map(url => deleteFromR2(url).catch(err => console.error(`Failed to delete ${url}:`, err)))
  );
};

