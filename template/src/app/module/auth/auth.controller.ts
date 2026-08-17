/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import status from "http-status";

import { envVars } from "../../config/env.js";
import { catchAsync } from "../../shared/catchAsync.js";
import { sendResponse } from "../../shared/sendResponse.js";
import { CookieUtils } from "../../utils/cookie.js";
import { AuthService } from "./auth.service.js";

const loginUser = catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.loginUser(req.body);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "User logged in successfully",
        data: result,
    });
});

const registerUser = catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.registerUser(req.body);

    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "User registered successfully",
        data: result,
    });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
    const betterAuthSessionToken = req.cookies["better-auth.session_token"];

    const result = await AuthService.changePassword(req.body, betterAuthSessionToken);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Password changed successfully",
        data: result,
    });
});

const logoutUser = catchAsync(async (req: Request, res: Response) => {
    const betterAuthSessionToken = req.cookies["better-auth.session_token"];
    const result = await AuthService.logoutUser(betterAuthSessionToken);

    CookieUtils.clearCookie(res, "better-auth.session_token", {
        httpOnly: true,
        secure: envVars.NODE_ENV === "production",
        sameSite: envVars.NODE_ENV === "production" ? "none" : "lax",
    });

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "User logged out successfully",
        data: result,
    });
});

const verifyEmail = catchAsync(async (req: Request, res: Response) => {
    const { email, otp } = req.body;
    await AuthService.verifyEmail(email, otp);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Email verified successfully",
    });
});

const forgetPassword = catchAsync(async (req: Request, res: Response) => {
    const { email } = req.body;
    await AuthService.forgetPassword(email);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Password reset OTP sent to email successfully",
    });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
    const { email, otp, newPassword } = req.body;
    await AuthService.resetPassword(email, otp, newPassword);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Password reset successfully",
    });
});

const ALLOWED_REDIRECT_PATHS = ["/dashboard", "/profile", "/settings", "/"];
const ALLOWED_OAUTH_ERRORS = ["oauth_failed", "access_denied", "invalid_request"];

const googleLogin = catchAsync(async (req: Request, res: Response) => {
    const redirectPath = Array.isArray(req.query.redirect)
        ? req.query.redirect[0]
        : req.query.redirect;
    const safePath = typeof redirectPath === "string" && ALLOWED_REDIRECT_PATHS.includes(redirectPath)
        ? redirectPath
        : "/dashboard";
    const callbackURL = `${envVars.BETTER_AUTH_URL}/api/auth/callback/google?callbackURL=${encodeURIComponent(
        `${envVars.FRONTEND_URL}${safePath}`,
    )}`;
    res.redirect(callbackURL);
});

const handleOAuthError = catchAsync(async (_req: Request, res: Response) => {
    const errorParam = Array.isArray(_req.query.error)
        ? _req.query.error[0]
        : _req.query.error;
    const safeError = typeof errorParam === "string" && ALLOWED_OAUTH_ERRORS.includes(errorParam)
        ? errorParam
        : "oauth_failed";
    res.redirect(`${envVars.FRONTEND_URL}/login?error=${encodeURIComponent(safeError)}`);
});

const updateProfile = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user.userId;
    const result = await AuthService.updateProfile(
        userId,
        req.body,
        req.file as Express.Multer.File | undefined,
    );

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Profile updated successfully",
        data: result,
    });
});

export const AuthController = {
    loginUser,
    registerUser,
    changePassword,
    logoutUser,
    verifyEmail,
    forgetPassword,
    resetPassword,
    googleLogin,
    handleOAuthError,
    updateProfile,
};