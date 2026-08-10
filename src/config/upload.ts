import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import config from './index';

cloudinary.config({
    cloud_name: config.cloudinary.cloud_name,
    api_key: config.cloudinary.api_key,
    api_secret: config.cloudinary.api_secret,
});

const storage = new CloudinaryStorage({
    cloudinary,
    params: (req, file) => ({
        folder: 'outfit_orbit',
        resource_type: 'auto'
    })
});

export const upload = multer({ storage });
