
/**
 * MSG91 SMS Utility
 * Handles sending and verifying OTPs via MSG91 API
 */

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_OTP_TEMPLATE_ID = process.env.MSG91_OTP_TEMPLATE_ID;

export interface Msg91Response {
    message: string;
    type: string;
}

/**
 * Send OTP using MSG91
 * @param phone with country code (e.g., 919876543210)
 */
export async function sendOtp(phone: string): Promise<boolean> {
    if (!MSG91_AUTH_KEY || !MSG91_OTP_TEMPLATE_ID) {
        console.error("[SMS] MSG91 configuration missing: AUTH_KEY or TEMPLATE_ID");
        return false;
    }

    try {
        const url = `https://control.msg91.com/api/v5/otp?template_id=${MSG91_OTP_TEMPLATE_ID}&mobile=${phone}&authkey=${MSG91_AUTH_KEY}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json() as Msg91Response;

        if (data.type === 'success') {
            console.log(`[SMS] OTP sent successfully to ${phone}`);
            return true;
        } else {
            console.error(`[SMS] Failed to send OTP to ${phone}:`, data.message);
            return false;
        }
    } catch (error) {
        console.error("[SMS] Error calling MSG91 Send OTP:", error);
        return false;
    }
}

/**
 * Verify OTP using MSG91
 * @param phone with country code
 * @param otp 6-digit OTP
 */
export async function verifyOtp(phone: string, otp: string): Promise<boolean> {
    if (!MSG91_AUTH_KEY) {
        console.error("[SMS] MSG91 AUTH_KEY missing");
        return false;
    }

    try {
        const url = `https://control.msg91.com/api/v5/otp/verify?otp=${otp}&mobile=${phone}&authkey=${MSG91_AUTH_KEY}`;

        const response = await fetch(url, {
            method: 'GET',
        });

        const data = await response.json() as Msg91Response;

        if (data.type === 'success' || data.message === 'OTP verified successfully' || data.message === 'already_verified') {
            console.log(`[SMS] OTP verified successfully for ${phone}`);
            return true;
        } else {
            console.error(`[SMS] OTP verification failed for ${phone}:`, data.message);
            return false;
        }
    } catch (error) {
        console.error("[SMS] Error calling MSG91 Verify OTP:", error);
        return false;
    }
}

/**
 * Resend OTP using MSG91
 * @param phone with country code
 */
export async function resendOtp(phone: string): Promise<boolean> {
    if (!MSG91_AUTH_KEY) {
        console.error("[SMS] MSG91 AUTH_KEY missing");
        return false;
    }

    try {
        const url = `https://control.msg91.com/api/v5/otp/retry?authkey=${MSG91_AUTH_KEY}&retrytype=text&mobile=${phone}`;

        const response = await fetch(url, {
            method: 'GET',
        });

        const data = await response.json() as Msg91Response;

        if (data.type === 'success') {
            console.log(`[SMS] OTP resent successfully to ${phone}`);
            return true;
        } else {
            console.error(`[SMS] Failed to resend OTP to ${phone}:`, data.message);
            return false;
        }
    } catch (error) {
        console.error("[SMS] Error calling MSG91 Resend OTP:", error);
        return false;
    }
}
/**
 * Verify access token from MSG91 OTP Widget
 * @param accessToken JWT token from the widget
 */
export async function verifyMsg91Token(accessToken: string): Promise<{ success: boolean; phone?: string; message?: string }> {
    if (!MSG91_AUTH_KEY) {
        console.error("[SMS] MSG91 AUTH_KEY missing");
        return { success: false, message: "Server configuration error" };
    }

    try {
        const url = 'https://control.msg91.com/api/v5/widget/verifyAccessToken';
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify({
                "authkey": MSG91_AUTH_KEY,
                "access-token": accessToken
            })
        });

        const data = await response.json();

        // MSG91 verification response usually has type: 'success'
        if (data.type === 'success') {
            // Identifier is usually the verified mobile/email
            const phone = data.mobile || data.identifier;
            return { success: true, phone };
        } else {
            return { success: false, message: data.message || "Token verification failed" };
        }
    } catch (error) {
        console.error("[SMS] Error verifying MSG91 token:", error);
        return { success: false, message: "Verification request failed" };
    }
}
