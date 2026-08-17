import { NextFunction, Request, Response } from "express";
import z from "zod";

export const validateRequest = (zodSchema: z.ZodObject) => {
    return (req: Request, _res: Response, next: NextFunction) => {
        if(req.body?.data){
            req.body = JSON.parse(req.body.data)
        }

        const parsedResult = zodSchema.safeParse(req.body)

        if (!parsedResult.success) {
            next(parsedResult.error)
            return
        }

        //sanitizing the data
        req.body = parsedResult.data;

        next();
    }
}

export const validateRequestFile = (zodSchema: z.ZodObject) => {
    return (req: Request, _res: Response, next: NextFunction) => {
        const parsedResult = zodSchema.safeParse(req.file)

        if (!parsedResult.success) {
            next(parsedResult.error)
            return
        }

        // req.file is kept intact (it carries buffer/encoding/etc from multer);
        // the parsed result is a gate check only
        next();
    }
}
