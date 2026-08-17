import { Router } from "express";
import { authHardLimiter, otpLimiter } from "../../middleware/authRateLimit.js";
import { checkAuth } from "../../middleware/checkAuth.js";
import { validateRequest, validateRequestFile } from "../../middleware/validateRequest.js";
import { multerUpload } from "../../config/multer.config.js";
import { AuthController } from "./auth.controller.js";
import {
    changePasswordSchema,
    forgetPasswordSchema,
    loginUserSchema,
    registerUserSchema,
    resetPasswordSchema,
    updateProfileSchema,
    verifyEmailSchema,
} from "./auth.validation.js";

const router = Router();

// Strict rate limiting for login/register/change-password/logout (5 req / 15 min)
router.use(authHardLimiter);

// Stricter rate limiting for OTP-generation endpoints (3 req / hour)
router.post("/verify-email", otpLimiter, validateRequest(verifyEmailSchema), AuthController.verifyEmail);
router.post("/forget-password", otpLimiter, validateRequest(forgetPasswordSchema), AuthController.forgetPassword);
router.post("/reset-password", otpLimiter, validateRequest(resetPasswordSchema), AuthController.resetPassword);

router.post("/login", validateRequest(loginUserSchema), AuthController.loginUser);
router.post("/register", validateRequest(registerUserSchema), AuthController.registerUser);
router.post("/change-password", validateRequest(changePasswordSchema), AuthController.changePassword);
router.post("/logout", AuthController.logoutUser);

router.patch("/profile", checkAuth(), multerUpload.single("image"), validateRequestFile(updateProfileSchema), AuthController.updateProfile);

router.get("/login/google", AuthController.googleLogin);
router.get("/oauth/error", AuthController.handleOAuthError);

export const AuthRoutes = router;
