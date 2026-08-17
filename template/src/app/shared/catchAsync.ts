import { NextFunction, Request, Response, RequestHandler } from "express";

export const catchAsync =
    (fn: (...args: [Request, Response, NextFunction]) => Promise<void>) =>
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await fn(req, res, next);
        } catch (error) {
            next(error);
        }
    };
