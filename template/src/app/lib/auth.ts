/* eslint-disable @typescript-eslint/no-explicit-any */
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer, emailOTP } from "better-auth/plugins";
import { Role, UserStatus } from "../../generated/prisma/enums.js";
import { envVars } from "../config/env.js";
import { sendEmail } from "../utils/email.js";
import { prisma } from "./prisma.js";
// If your Prisma file is located elsewhere, you can change the path

// Cross-site cookies (sameSite "none") require the Secure flag, which browsers
// only honour over HTTPS. In production we sit behind Coolify's TLS proxy, so
// both are enabled; locally we fall back to lax/insecure so dev over HTTP works.
const isProduction = envVars.NODE_ENV === "production";

const cookieAttributes = {
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
    httpOnly: true,
    path: "/",
} as const;

// Warn when Google OAuth credentials are partially configured
if (
    (envVars.GOOGLE_CLIENT_ID && !envVars.GOOGLE_CLIENT_SECRET) ||
    (!envVars.GOOGLE_CLIENT_ID && envVars.GOOGLE_CLIENT_SECRET)
) {
    console.warn(
        "⚠️  Google OAuth requires both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET. " +
        "Both must be set or both must be empty. Disabling Google OAuth.",
    );
}

const socialProvidersConfig =
    envVars.GOOGLE_CLIENT_ID && envVars.GOOGLE_CLIENT_SECRET
        ? {
              google: {
                  clientId: envVars.GOOGLE_CLIENT_ID,
                  clientSecret: envVars.GOOGLE_CLIENT_SECRET,
                  mapProfileToUser: () => ({
                      role: Role.USER,
                      status: UserStatus.ACTIVE,
                      needPasswordChange: false,
                      emailVerified: true,
                      isDeleted: false,
                      deletedAt: null,
                  }),
              },
          }
        : undefined;

export const auth = betterAuth({
    baseURL: envVars.BETTER_AUTH_URL,
    secret: envVars.BETTER_AUTH_SECRET,
    database: prismaAdapter(prisma, {
        provider: "postgresql", // or "mysql", "postgresql", ...etc
    }),

    emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
    },

    socialProviders: socialProvidersConfig,

    emailVerification: {
        sendOnSignUp: false,
        sendOnSignIn: false,
        autoSignInAfterVerification: true,
    },

    user: {
        additionalFields: {
            role: {
                type: "string",
                required: true,
                defaultValue: Role.USER,
            },

            status: {
                type: "string",
                required: true,
                defaultValue: UserStatus.ACTIVE,
            },

            needPasswordChange: {
                type: "boolean",
                required: true,
                defaultValue: false,
            },

            isDeleted: {
                type: "boolean",
                required: true,
                defaultValue: false,
            },

            deletedAt: {
                type: "date",
                required: false,
                defaultValue: null,
            },
        },
    },

    plugins: [
        bearer(),
        emailOTP({
            overrideDefaultEmailVerification: true,
            async sendVerificationOTP({ email, otp, type }) {
                if (type === "email-verification") {
                    const user = await prisma.user.findUnique({
                        where: { email },
                    });

                    if (!user) {
                        console.error(`User with email ${email} not found. Cannot send verification OTP.`);
                        return;
                    }

                    if (user.role === Role.SUPER_ADMIN) {
                        return;
                    }

                    if (user && !user.emailVerified) {
                        sendEmail({
                            to: email,
                            subject: "Verify your email",
                            templateName: "otp",
                            templateData: { name: user.name, otp },
                        });
                    }
                } else if (type === "forget-password") {
                    const user = await prisma.user.findUnique({
                        where: { email },
                    });

                    if (user) {
                        sendEmail({
                            to: email,
                            subject: "Password Reset OTP",
                            templateName: "otp",
                            templateData: { name: user.name, otp },
                        });
                    }
                }
            },
            expiresIn: 2 * 60,
            otpLength: 6,
        }),
    ],

    session: {
        expiresIn: 24 * 60 * 60 * 1000,
        updateAge: 24 * 60 * 60 * 1000,
        cookieCache: {
            enabled: true,
            maxAge: 24 * 60 * 60 * 1000,
        },
    },

    redirectURLs: {
        signIn: `${envVars.BETTER_AUTH_URL}/api/auth/sign-in`,
    },

    trustedOrigins: [envVars.BETTER_AUTH_URL, envVars.FRONTEND_URL],

    advanced: {
        useSecureCookies: isProduction,
        cookies: {
            state: { attributes: cookieAttributes },
            sessionToken: { attributes: cookieAttributes },
        },
    },
});
