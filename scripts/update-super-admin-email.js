/**
 * Script to update super admin email from super@travunited.com to travunited3@gmail.com
 * 
 * Usage:
 *   node scripts/update-super-admin-email.js
 * 
 * Or with environment variables:
 *   set -a; source .env; set +a
 *   node scripts/update-super-admin-email.js
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function updateSuperAdminEmail() {
  try {
    console.log("🔄 Updating super admin email...");

    // Check if new email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: "travunited3@gmail.com" },
    });

    if (existingUser && existingUser.role !== "SUPER_ADMIN") {
      console.error("❌ Error: travunited3@gmail.com already exists with role:", existingUser.role);
      console.error("   Please resolve this conflict manually before updating.");
      process.exit(1);
    }

    // Find the current super admin
    const currentSuperAdmin = await prisma.user.findUnique({
      where: { email: "super@travunited.com" },
    });

    if (!currentSuperAdmin) {
      console.log("⚠️  No user found with email: super@travunited.com");
      console.log("   Checking if travunited3@gmail.com already exists as super admin...");
      
      const newSuperAdmin = await prisma.user.findUnique({
        where: { email: "travunited3@gmail.com" },
      });

      if (newSuperAdmin && newSuperAdmin.role === "SUPER_ADMIN") {
        console.log("✅ Super admin email is already set to travunited3@gmail.com");
        return;
      } else {
        console.error("❌ No super admin found. Please create one manually or run seed script.");
        process.exit(1);
      }
    }

    if (currentSuperAdmin.role !== "SUPER_ADMIN") {
      console.error("❌ Error: super@travunited.com exists but is not a SUPER_ADMIN");
      process.exit(1);
    }

    // If new email already exists and is the same user, no update needed
    if (existingUser && existingUser.id === currentSuperAdmin.id) {
      console.log("✅ Super admin email is already set to travunited3@gmail.com");
      return;
    }

    // Update the email
    await prisma.user.update({
      where: { id: currentSuperAdmin.id },
      data: { email: "travunited3@gmail.com" },
    });

    console.log("✅ Successfully updated super admin email:");
    console.log(`   From: super@travunited.com`);
    console.log(`   To:   travunited3@gmail.com`);
    console.log(`   User ID: ${currentSuperAdmin.id}`);
  } catch (error) {
    console.error("❌ Error updating super admin email:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateSuperAdminEmail();

