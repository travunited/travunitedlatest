const { PrismaClient } = require('@prisma/client');

async function testConnection() {
    const prisma = new PrismaClient();
    try {
        console.log("Attempting to connect to database...");
        const userCount = await prisma.user.count();
        console.log(`Connection successful. User count: ${userCount}`);

        // Check if phoneVerified exists by trying to find a user with it
        try {
            await prisma.user.findFirst({
                where: { phoneVerified: true }
            });
            console.log("Column 'phoneVerified' exists in database.");
        } catch (e) {
            if (e.message.includes('phoneVerified')) {
                console.error("Column 'phoneVerified' DOES NOT exist in database.");
            } else {
                console.error("Error checking column existence:", e.message);
            }
        }
    } catch (error) {
        console.error("Database connection failed:", error.message);
    } finally {
        await prisma.$disconnect();
    }
}

testConnection();
