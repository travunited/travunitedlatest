const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function main() {
    try {
        const lead = await prisma.corporateLead.create({
            data: {
                id: crypto.randomUUID(),
                updatedAt: new Date(),
                companyName: 'ABC PVT LIMITED',
                contactName: 'SHRI',
                email: 'travunited06@gmail.com',
                phone: '9845864152',
                message: 'AGAGAFGAFG',
                gstNumber: '29AAICTB376R1Z1',
                status: 'NEW',
            },
        });
        console.log('Lead created:', lead.id);
    } catch (err) {
        console.error('Prisma Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
