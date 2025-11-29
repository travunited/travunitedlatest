const crypto = require('crypto');
const bcrypt = require('bcryptjs');

async function testTokenLogic() {
    console.log('Testing token logic...');

    // 1. Generate token
    const rawToken = crypto.randomBytes(32).toString('hex');
    console.log('Raw Token:', rawToken);
    console.log('Raw Token Length:', rawToken.length);

    // 2. Hash token
    const tokenHash = await bcrypt.hash(rawToken, 10);
    console.log('Token Hash:', tokenHash);

    // 3. Compare token
    const match = await bcrypt.compare(rawToken, tokenHash);
    console.log('Match:', match);

    if (match) {
        console.log('SUCCESS: Token logic is valid.');
    } else {
        console.error('FAILURE: Token logic is invalid.');
    }

    // 4. Test with URL encoding/decoding
    const encodedToken = encodeURIComponent(rawToken);
    console.log('Encoded Token:', encodedToken);

    const decodedToken = decodeURIComponent(encodedToken);
    console.log('Decoded Token:', decodedToken);

    const matchDecoded = await bcrypt.compare(decodedToken, tokenHash);
    console.log('Match Decoded:', matchDecoded);

    if (matchDecoded) {
        console.log('SUCCESS: URL encoding/decoding logic is valid.');
    } else {
        console.error('FAILURE: URL encoding/decoding logic is invalid.');
    }
}

testTokenLogic();
