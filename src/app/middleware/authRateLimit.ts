import rateLimit from "express-rate-limit";

// Login and registration — protect against brute-force
export const authHardLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: { success: false, message: "Too many requests, please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
});

// OTP generation endpoints — stricter per-IP limit to prevent OTP bombing
export const otpLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: { success: false, message: "Too many OTP requests, please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
});