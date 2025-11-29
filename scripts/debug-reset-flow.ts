import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'test-debug@example.com';

    console.log(`1. Finding/Creating user ${email}...`);
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        user = await prisma.user.create({
            data: {
                email,
                passwordHash: 'placeholder',
                name: 'Debug User',
            },
        });
        console.log('User created:', user.id);
    } else {
        console.log('User found:', user.id);
    }

    console.log('2. Generating token...');
    const rawToken = crypto.randomBytes(32).toString('hex');
    console.log('Raw Token:', rawToken);

    const tokenHash = await bcrypt.hash(rawToken, 10);
    console.log('Token Hash:', tokenHash);

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    console.log('3. Creating PasswordReset record...');
    const passwordReset = await prisma.passwordReset.create({
        data: {
            userId: user.id,
            tokenHash,
            expiresAt,
        },
    });
    console.log('PasswordReset created:', passwordReset.id);

    const encodedToken = encodeURIComponent(rawToken);
    const encodedId = encodeURIComponent(passwordReset.id);

    console.log('\n--- TEST INFO ---');
    console.log(`Token: ${rawToken}`);
    console.log(`ID: ${passwordReset.id}`);
    console.log(`Validation URL: http://localhost:3000/api/auth/validate-reset-token?token=${encodedToken}&id=${encodedId}`);
    console.log(`Curl Command:`);
    console.log(`curl "http://localhost:3000/api/auth/validate-reset-token?token=${encodedToken}&id=${encodedId}"`);
    console.log('-----------------\n');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
