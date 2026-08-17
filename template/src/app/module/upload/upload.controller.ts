import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync.js";
import { sendResponse } from "../../shared/sendResponse.js";
import { UploadService } from "./upload.service.js";

const uploadFile = catchAsync(async (req: Request, res: Response) => {
    const result = await UploadService.uploadFile(req.file as Express.Multer.File);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "File uploaded successfully",
        data: result,
    });
});

export const UploadController = {
    uploadFile,
};