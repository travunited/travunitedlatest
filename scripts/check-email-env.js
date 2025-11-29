const fs = require('fs');
const path = require('path');

function checkEnv() {
    console.log('Checking environment variables...');

    // Try to read .env.local or .env
    let envContent = '';
    try {
        envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
    } catch (e) {
        try {
            envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
        } catch (e2) {
            console.log('Could not read .env or .env.local file directly.');
        }
    }

    // Parse env content manually to avoid dependencies
    const env = {};
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim();
            env[key] = value;
        }
    });

    // Also check process.env (if running with dotenv preloaded, though we are running with node directly)
    // But for this script, we rely on file reading or what's available.

    const resendKey = env.RESEND_API_KEY || process.env.RESEND_API_KEY;
    const emailFrom = env.EMAIL_FROM || process.env.EMAIL_FROM;
    const nextAuthUrl = env.NEXTAUTH_URL || process.env.NEXTAUTH_URL;

    console.log('RESEND_API_KEY:', resendKey ? 'Present (' + resendKey.substring(0, 5) + '...)' : 'MISSING');
    console.log('EMAIL_FROM:', emailFrom ? 'Present (' + emailFrom + ')' : 'MISSING');
    console.log('NEXTAUTH_URL:', nextAuthUrl ? 'Present (' + nextAuthUrl + ')' : 'MISSING');
}

checkEnv();
