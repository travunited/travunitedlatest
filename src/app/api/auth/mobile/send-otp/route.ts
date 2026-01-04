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

        // Clean phone number (remove any non-digits, ensuring it has country code)
        const cleanPhone = phone.replace(/\D/g, "");

        // MSG91 v5 OTP Send API
        // https://docs.msg91.com/p/tf9vsw6un/v/6v3r7z/otp/send-otp
        const url = `https://control.msg91.com/api/v5/otp?template_id=${templateId}&mobile=${cleanPhone}&authkey=${authKey}&otp_length=4`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const data = await response.json();
        if (data.type !== "success") {
            console.error('OTP send error:', data);
            return NextResponse.json({ error: data?.message || 'Failed to send OTP' }, { status: 400 });
        }

        return NextResponse.json({ success: true, requestId: data?.request_id || data?.requestId });
    } catch (err) {
        console.error('Error in send-otp route:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
