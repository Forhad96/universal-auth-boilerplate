import { Role } from "../../generated/prisma/enums.js";
import { envVars } from "../config/env.js";
import { auth } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";

export const seedSuperAdmin = async () => {
    // Tracks the user created by signUpEmail below, so a failure part-way through
    // can roll back *only* that half-created record. Never delete by email —
    // a transient DB error would otherwise wipe a healthy super admin.
    let createdUserId: string | undefined;

    try {
        const isSuperAdminExist = await prisma.user.findFirst({
            where:{
                role : Role.SUPER_ADMIN
            }
        })

        if(isSuperAdminExist) {
            console.log("Super admin already exists. Skipping seeding super admin.");
            return;
        }

        const superAdminUser = await auth.api.signUpEmail({
            body:{
                email : envVars.SUPER_ADMIN_EMAIL,
                password : envVars.SUPER_ADMIN_PASSWORD || `SuperAdmin@${Date.now()}`,
                name : "Super Admin",
                role : Role.SUPER_ADMIN,
                needPasswordChange : false,
                rememberMe : false,
            }
        })

        createdUserId = superAdminUser.user.id;

        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where : {
                    id : superAdminUser.user.id
                },
                data : {
                    emailVerified : true,
                }
            });
        });

        console.log("Super admin seeded.");
    } catch (error) {
        console.error("Error seeding super admin: ", error);

        if (createdUserId) {
            // Roll back the partially-created user, but never let cleanup failure
            // escape — this runs at boot and must not take the process down.
            await prisma.user
                .delete({ where: { id: createdUserId } })
                .catch((cleanupError) =>
                    console.error("Failed to roll back partial super admin: ", cleanupError),
                );
        }
    }
}
