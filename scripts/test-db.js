const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
    try {
        const email = 'travunited021@gmail.com';
        console.log('Checking if user exists:', email);
        const existingUser = await prisma.user.findUnique({ where: { email } });

        if (existingUser) {
            console.log('User already exists:', existingUser);
            return;
        }

        console.log('Creating new admin...');
        const passwordHash = await bcrypt.hash('Testpassword123', 10);

        const admin = await prisma.user.create({
            data: {
                id: crypto.randomUUID(),
                updatedAt: new Date(),
                name: 'Shagufta',
                email,
                passwordHash,
                role: 'STAFF_ADMIN',
                isActive: true,
            },
        });
        console.log('Admin created successfully:', admin.id);

        console.log('Finding SUPER_ADMINs...');
        const superAdmins = await prisma.user.findMany({
            where: {
                role: 'SUPER_ADMIN',
                isActive: true,
                id: { not: admin.id },
            },
            select: { id: true },
        });
        console.log('Found', superAdmins.length, 'SUPER_ADMINs');

    } catch (err) {
        console.error('Error in script:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
