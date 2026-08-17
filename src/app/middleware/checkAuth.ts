/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from "express";
import status from "http-status";
import { Role, UserStatus } from "../../generated/prisma/enums.js";
import AppError from "../errorHelpers/AppError.js";
import { auth } from "../lib/auth.js";
import { CookieUtils } from "../utils/cookie.js";

export const checkAuth =
    (...authRoles: Role[]) =>
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Accept token from either Authorization header or session cookie
            const authHeader = req.headers.authorization;
            const bearerToken = authHeader?.startsWith("Bearer ")
                ? authHeader.slice(7)
                : CookieUtils.getCookie(req, "better-auth.session_token");

            if (!bearerToken) {
                throw new AppError(status.UNAUTHORIZED, "Unauthorized access! No token provided.");
            }

            const session = await auth.api.getSession({
                headers: new Headers({ Authorization: `Bearer ${bearerToken}` }),
            });

            if (!session) {
                throw new AppError(status.UNAUTHORIZED, "Unauthorized access! Invalid or expired token.");
            }

            const user = session.user;

            if (user.status === UserStatus.BLOCKED || user.status === UserStatus.DELETED) {
                throw new AppError(status.UNAUTHORIZED, "Unauthorized access! User is not active.");
            }

            if (user.isDeleted) {
                throw new AppError(status.UNAUTHORIZED, "Unauthorized access! User is deleted.");
            }

            if (authRoles.length > 0 && !authRoles.includes(user.role as Role)) {
                throw new AppError(
                    status.FORBIDDEN,
                    "Forbidden access! You do not have permission to access this resource.",
                );
            }

            req.user = { userId: user.id, role: user.role, email: user.email };
            next();
        } catch (error) {
            next(error);
        }
    };
