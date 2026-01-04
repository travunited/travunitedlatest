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

        // Clean phone number (remove any non-digits)
        const cleanPhone = phone.replace(/\D/g, "");

        console.log(`[SMS] Sending OTP. Phone: ${cleanPhone}, Template: ${templateId}`);

        // SMS v5 OTP Send API - Moving to JSON body for better compatibility
        const url = `https://control.msg91.com/api/v5/otp`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'authkey': authKey.trim()
            },
            body: JSON.stringify({
                template_id: templateId.trim(),
                mobile: cleanPhone,
                otp_length: 4
            })
        });

        const data = await response.json();
        console.log(`[SMS] Provider response:`, JSON.stringify(data));

        if (data.type !== "success" && data.message !== "Already Sent") {
            console.error('[SMS] Send error details:', data);
            return NextResponse.json({ error: data?.message || 'Failed to send OTP' }, { status: 400 });
        }

        // Handle "Already Sent" as success to avoid confusing the user
        return NextResponse.json({
            success: true,
            requestId: data?.request_id || data?.requestId || data?.message
        });
    } catch (err: any) {
        console.error('[SMS] Critical error in send-otp route:', err);
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}
