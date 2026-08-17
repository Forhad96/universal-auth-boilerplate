import { Request, Response } from "express";
import status from "http-status";
import { Prisma } from "../../generated/prisma/client.js";
import z from "zod";
import AppError from "../errorHelpers/AppError.js";
import { handlePrismaClientKnownRequestError, handlePrismaClientUnknownError, handlePrismaClientValidationError, handlerPrismaClientInitializationError, handlerPrismaClientRustPanicError } from "../errorHelpers/handlePrismaErrors.js";
import { handleZodError } from "../errorHelpers/handleZodError.js";
import { TErrorResponse, TErrorSources } from "../interfaces/error.interface.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const globalErrorHandler = async (err: any, _req: Request, res: Response) => {
    console.error("[Error]", err);

    let statusCode: number = status.INTERNAL_SERVER_ERROR;
    let message: string = "Internal Server Error";
    let errorSources: TErrorSources[] = [];

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        const simplifiedError = handlePrismaClientKnownRequestError(err);
        statusCode = simplifiedError.statusCode ?? status.INTERNAL_SERVER_ERROR;
        message = simplifiedError.message;
        errorSources = simplifiedError.errorSources;
    } else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
        const simplifiedError = handlePrismaClientUnknownError(err);
        statusCode = simplifiedError.statusCode ?? status.INTERNAL_SERVER_ERROR;
        message = simplifiedError.message;
        errorSources = simplifiedError.errorSources;
    } else if (err instanceof Prisma.PrismaClientValidationError) {
        const simplifiedError = handlePrismaClientValidationError(err);
        statusCode = simplifiedError.statusCode ?? status.INTERNAL_SERVER_ERROR;
        message = simplifiedError.message;
        errorSources = simplifiedError.errorSources;
    } else if (err instanceof Prisma.PrismaClientRustPanicError) {
        const simplifiedError = handlerPrismaClientRustPanicError();
        statusCode = simplifiedError.statusCode ?? status.INTERNAL_SERVER_ERROR;
        message = simplifiedError.message;
        errorSources = simplifiedError.errorSources;
    } else if (err instanceof Prisma.PrismaClientInitializationError) {
        const simplifiedError = handlerPrismaClientInitializationError(err);
        statusCode = simplifiedError.statusCode ?? status.INTERNAL_SERVER_ERROR;
        message = simplifiedError.message;
        errorSources = simplifiedError.errorSources;
    } else if (err instanceof z.ZodError) {
        const simplifiedError = handleZodError(err);
        statusCode = simplifiedError.statusCode ?? status.INTERNAL_SERVER_ERROR;
        message = simplifiedError.message;
        errorSources = simplifiedError.errorSources;
    } else if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
        errorSources = [{ path: "", message: err.message }];
    } else if (err instanceof Error) {
        statusCode = status.INTERNAL_SERVER_ERROR;
        message = err.message;
        errorSources = [{ path: "", message: err.message }];
    }

    const errorResponse: TErrorResponse = {
        success: false,
        statusCode,
        message,
        errorSources,
    };

    res.status(statusCode).json(errorResponse);
};