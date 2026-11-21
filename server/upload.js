import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

// File giữ trong RAM rồi đẩy thẳng lên Cloudinary => không ghi đĩa Render (đĩa mất khi restart)
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, cb) =>
    /^(image|video)\//.test(file.mimetype) ? cb(null, true) : cb(new Error('Chỉ cho phép ảnh hoặc video')),
});

export function uploadToCloud(file, folder) {
  if (!process.env.CLOUDINARY_URL) throw new Error('Server chưa cấu hình CLOUDINARY_URL');
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder: `trip-memories/${folder}`, resource_type: 'auto' }, (err, r) =>
        err ? reject(err) : resolve({ url: r.secure_url, type: r.resource_type === 'video' ? 'video' : 'image' })
      )
      .end(file.buffer);
  });
}
