const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const superAdminEmail = 'travunited3@gmail.com';
    const staffAdminEmail = 'ops@travunited.com';
    const password = 'Admin@123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check Super Admin
    let superAdmin = await prisma.user.findUnique({
        where: { email: superAdminEmail },
    });

    if (!superAdmin) {
        console.log('Creating Super Admin...');
        superAdmin = await prisma.user.create({
            data: {
                email: superAdminEmail,
                name: 'Super Admin',
                passwordHash: hashedPassword,
                role: 'SUPER_ADMIN',
                isActive: true,
            },
        });
        console.log('Super Admin created.');
    } else {
        console.log('Super Admin already exists.');
        // Update password just in case
        await prisma.user.update({
            where: { email: superAdminEmail },
            data: { passwordHash: hashedPassword, role: 'SUPER_ADMIN', isActive: true },
        });
        console.log('Super Admin password/role updated.');
    }

    // Check Staff Admin
    let staffAdmin = await prisma.user.findUnique({
        where: { email: staffAdminEmail },
    });

    if (!staffAdmin) {
        console.log('Creating Staff Admin...');
        staffAdmin = await prisma.user.create({
            data: {
                email: staffAdminEmail,
                name: 'Staff Admin',
                passwordHash: hashedPassword,
                role: 'STAFF_ADMIN',
                isActive: true,
            },
        });
        console.log('Staff Admin created.');
    } else {
        console.log('Staff Admin already exists.');
        // Update password just in case
        await prisma.user.update({
            where: { email: staffAdminEmail },
            data: { passwordHash: hashedPassword, role: 'STAFF_ADMIN', isActive: true },
        });
        console.log('Staff Admin password/role updated.');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
