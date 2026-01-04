import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { phone } = await request.json();
        if (!phone) {
            return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
        }

        const authKey = process.env.MSG91_AUTH_KEY;
        const templateId = process.env.MSG91_OTP_TEMPLATE_ID;
        if (!authKey || !templateId) {
            return NextResponse.json({ error: 'MSG91 configuration missing' }, { status: 500 });
        }

        const payload = {
            mobile: phone,
            authkey: authKey,
            template_id: templateId,
            otp_length: 6,
        };

        const response = await fetch('https://api.msg91.com/api/v5/otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (!response.ok) {
            console.error('MSG91 send OTP error:', data);
            return NextResponse.json({ error: data?.message || 'Failed to send OTP' }, { status: 500 });
        }

        return NextResponse.json({ success: true, requestId: data?.request_id || data?.requestId });
    } catch (err) {
        console.error('Error in send-otp route:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
