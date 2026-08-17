import status from "http-status";
import { UserStatus } from "../../../generated/prisma/enums.js";
import AppError from "../../errorHelpers/AppError.js";
import { auth } from "../../lib/auth.js";
import { prisma } from "../../lib/prisma.js";
import { uploadFileToCloudinary } from "../../config/cloudinary.config.js";
import {
    IChangePasswordPayload,
    ILoginUserPayload,
    IRegisterUserPayload,
    IUpdateProfilePayload,
} from "./auth.interface.js";

const loginUser = async (payload: ILoginUserPayload) => {
    const { email, password } = payload;

    const data = await auth.api.signInEmail({
        body: { email, password },
    });

    if (data.user.status === UserStatus.BLOCKED) {
        throw new AppError(status.FORBIDDEN, "User is blocked");
    }

    if (data.user.isDeleted || data.user.status === UserStatus.DELETED) {
        throw new AppError(status.NOT_FOUND, "User is deleted");
    }

    return data;
};

const registerUser = async (payload: IRegisterUserPayload) => {
    const { email, password, name } = payload;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        throw new AppError(status.CONFLICT, "A user with this email already exists");
    }

    const result = await auth.api.signUpEmail({
        body: { email, password, name },
    });

    return result;
};

const changePassword = async (payload: IChangePasswordPayload, sessionToken: string) => {
    const session = await auth.api.getSession({
        headers: new Headers({ Authorization: `Bearer ${sessionToken}` }),
    });

    if (!session) {
        throw new AppError(status.UNAUTHORIZED, "Invalid session token");
    }

    const result = await auth.api.changePassword({
        body: {
            currentPassword: payload.currentPassword,
            newPassword: payload.newPassword,
            revokeOtherSessions: true,
        },
        headers: new Headers({ Authorization: `Bearer ${sessionToken}` }),
    });

    if (session.user.needPasswordChange) {
        await prisma.user.update({
            where: { id: session.user.id },
            data: { needPasswordChange: false },
        });
    }

    return result;
};

const updateProfile = async (
    userId: string,
    payload: IUpdateProfilePayload,
    file?: Express.Multer.File,
): Promise<{ id: string; name: string; email: string; image: string | null }> => {
    if (!payload.name && !file) {
        throw new AppError(status.BAD_REQUEST, "Provide at least one field to update");
    }

    let imageUrl: string | undefined;
    if (file) {
        const result = await uploadFileToCloudinary(file.buffer, file.originalname);
        imageUrl = result.secure_url;
    }

    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
            ...(payload.name !== undefined ? { name: payload.name } : {}),
            ...(imageUrl !== undefined ? { image: imageUrl ?? null } : {}),
        },
        select: { id: true, name: true, email: true, image: true },
    });

    return updatedUser;
};

const logoutUser = async (sessionToken: string) => {
    return auth.api.signOut({
        headers: new Headers({ Authorization: `Bearer ${sessionToken}` }),
    });
};

const verifyEmail = async (email: string, otp: string) => {
    await auth.api.verifyEmailOTP({
        body: { email, otp },
    });
};

const forgetPassword = async (email: string) => {
    const isUserExist = await prisma.user.findUnique({ where: { email } });

    if (!isUserExist) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    if (!isUserExist.emailVerified) {
        throw new AppError(status.BAD_REQUEST, "Email not verified");
    }

    if (isUserExist.isDeleted || isUserExist.status === UserStatus.DELETED) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    await auth.api.requestPasswordResetEmailOTP({ body: { email } });
};

const resetPassword = async (email: string, otp: string, newPassword: string) => {
    const isUserExist = await prisma.user.findUnique({ where: { email } });

    if (!isUserExist) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    if (!isUserExist.emailVerified) {
        throw new AppError(status.BAD_REQUEST, "Email not verified");
    }

    if (isUserExist.isDeleted || isUserExist.status === UserStatus.DELETED) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    await auth.api.resetPasswordEmailOTP({
        body: { email, otp, password: newPassword },
    });

    if (isUserExist.needPasswordChange) {
        await prisma.user.update({
            where: { id: isUserExist.id },
            data: { needPasswordChange: false },
        });
    }

    await prisma.session.deleteMany({ where: { userId: isUserExist.id } });
};

export const AuthService = {
    loginUser,
    registerUser,
    changePassword,
    updateProfile,
    logoutUser,
    verifyEmail,
    forgetPassword,
    resetPassword,
};
