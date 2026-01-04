import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { phone } = await request.json();
        if (!phone) {
            return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
        }

        const authKey = process.env.MSG91_AUTH_KEY;
        const widgetId = process.env.NEXT_PUBLIC_MSG91_WIDGET_ID;
        const tokenAuth = process.env.NEXT_PUBLIC_MSG91_TOKEN_AUTH;

        if (!authKey || !widgetId || !tokenAuth) {
            return NextResponse.json({ error: 'SMS configuration missing' }, { status: 500 });
        }

        // Clean phone number (remove any non-digits)
        const cleanPhone = phone.replace(/\D/g, "");

        console.log(`[SMS] Sending OTP via Widget API. Phone: ${cleanPhone}`);

        // Using the Widget-specific sendOtp API which matches the SDK behavior
        const url = `https://api.msg91.com/api/v5/widget/sendOtp`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                widgetId: widgetId.trim(),
                tokenAuth: tokenAuth.trim(),
                mobile: cleanPhone,
            })
        });

        const data = await response.json();
        console.log(`[SMS] Provider response:`, JSON.stringify(data));

        if (data.type !== "success" && data.message !== "Already Sent") {
            // Fallback to standard OTP API if Widget API fails
            console.log("[SMS] Widget API failed, trying Standard OTP API...");
            const templateId = process.env.MSG91_OTP_TEMPLATE_ID;
            if (templateId) {
                const fallbackUrl = `https://control.msg91.com/api/v5/otp`;
                const fallbackResponse = await fetch(fallbackUrl, {
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
                const fallbackData = await fallbackResponse.json();
                console.log(`[SMS] Fallback response:`, JSON.stringify(fallbackData));

                if (fallbackData.type === "success") {
                    return NextResponse.json({
                        success: true,
                        requestId: fallbackData.request_id || fallbackData.requestId
                    });
                }
            }

            console.error('[SMS] Send error details:', data);
            return NextResponse.json({ error: data?.message || 'Failed to send OTP' }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            requestId: data?.request_id || data?.requestId || data?.message
        });
    } catch (err: any) {
        console.error('[SMS] Critical error in send-otp route:', err);
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}
