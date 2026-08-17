import status from "http-status";
import AppError from "../../errorHelpers/AppError.js";
import { uploadFileToCloudinary } from "../../config/cloudinary.config.js";

const uploadFile = async (file: Express.Multer.File) => {
    if (!file) {
        throw new AppError(status.BAD_REQUEST, "File is required");
    }

    const result = await uploadFileToCloudinary(file.buffer, file.originalname);

    return {
        url: result.secure_url,
        publicId: result.public_id,
    };
};

export const UploadService = { uploadFile };