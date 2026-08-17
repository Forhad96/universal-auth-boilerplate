import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import status from "http-status";
import AppError from "../errorHelpers/AppError.js";
import { envVars } from "./env.js";

cloudinary.config({
    cloud_name: envVars.CLOUDINARY.CLOUDINARY_CLOUD_NAME,
    api_key: envVars.CLOUDINARY.CLOUDINARY_API_KEY,
    api_secret: envVars.CLOUDINARY.CLOUDINARY_API_SECRET,
});

export const uploadFileToCloudinary = async (
    buffer: Buffer,
    fileName: string,
): Promise<UploadApiResponse> => {
    if (!buffer || !fileName) {
        throw new AppError(status.BAD_REQUEST, "File buffer and file name are required for upload");
    }

    const extension = fileName.split(".").pop()?.toLocaleLowerCase();
    const fileNameWithoutExtension = fileName
        .split(".")
        .slice(0, -1)
        .join(".")
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9\-]/g, "");

    const uniqueName =
        Math.random().toString(36).substring(2) + "-" + Date.now() + "-" + fileNameWithoutExtension;

    const folder = extension === "pdf" ? "pdfs" : "images";
    const folderPath = `${envVars.CLOUDINARY_FOLDER || "boilerplate-uploads"}/${folder}`;

    return new Promise((resolve, reject) => {
        cloudinary.uploader
            .upload_stream(
                {
                    resource_type: "auto",
                    public_id: folderPath + "/" + uniqueName,
                },
                (error, result) => {
                    if (error) {
                        return reject(
                            new AppError(status.INTERNAL_SERVER_ERROR, "Failed to upload file to Cloudinary"),
                        );
                    }
                    resolve(result as UploadApiResponse);
                },
            )
            .end(buffer);
    });
};

export const cloudinaryUpload = cloudinary;
