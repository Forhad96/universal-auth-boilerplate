import { Router } from "express";
import { multerUpload } from "../../config/multer.config.js";
import { validateRequestFile } from "../../middleware/validateRequest.js";
import { UploadController } from "./upload.controller.js";
import { uploadFileSchema } from "./upload.validation.js";

const router = Router();

router.post(
    "/file",
    multerUpload.single("file"),
    validateRequestFile(uploadFileSchema),
    UploadController.uploadFile,
);

export const UploadRoutes = router;