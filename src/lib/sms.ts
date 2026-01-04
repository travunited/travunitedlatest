
/**
 * MSG91 SMS Utility
 * Handles sending and verifying OTPs via MSG91 API
 */

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || "455112A2GSu4oHCET6949181cP1";
const MSG91_OTP_TEMPLATE_ID = process.env.MSG91_OTP_TEMPLATE_ID || "69580bd61ecf7f50b04befb4";

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
        const url = `https://control.msg91.com/api/v5/otp?template_id=${MSG91_OTP_TEMPLATE_ID}&mobile=${phone}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'authkey': MSG91_AUTH_KEY,
            },
        });

        const data = await response.json() as Msg91Response;

        if (data.type === 'success' || (data as any).request_id) {
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
        const url = `https://control.msg91.com/api/v5/otp/verify?otp=${otp}&mobile=${phone}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'authkey': MSG91_AUTH_KEY,
            }
        });

        const data = await response.json() as Msg91Response;

        if (data.type === 'success' || data.message === 'OTP verified successfully' || data.message === 'already_verified' || (data as any).message?.toLowerCase().includes("verified")) {
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
        const url = `https://control.msg91.com/api/v5/otp/retry?retrytype=text&mobile=${phone}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'authkey': MSG91_AUTH_KEY,
            }
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

    const endpoints = [
        'https://control.msg91.com/api/v5/widget/verifyAccessToken',
        'https://api.msg91.com/api/v5/widget/verifyToken',
        'https://control.msg91.com/api/v5/widget/verifyToken'
    ];

    for (const url of endpoints) {
        try {
            console.log(`[SMS] Trying MSG91 verification at: ${url}`);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "authkey": MSG91_AUTH_KEY.trim()
                },
                body: JSON.stringify({
                    "authkey": MSG91_AUTH_KEY.trim(),
                    "access-token": accessToken,
                    "accessToken": accessToken,
                    "token": accessToken
                })
            });

            if (!response.ok) {
                console.warn(`[SMS] Endpoint ${url} returned status ${response.status}`);
                continue;
            }

            const data = await response.json();
            console.log(`[SMS] Response from ${url}:`, JSON.stringify(data));

            if (data.type === 'success' || data.status === 'success' || data.message === 'verified' || (typeof data.message === 'string' && data.message.length > 5)) {
                // Extract phone from all possible fields
                const phone = data.mobile || data.identifier || data.phone || data.mobileNumber || data.contact ||
                    (typeof data.message === 'string' && data.message.length > 5 ? data.message : null);

                if (phone) {
                    return { success: true, phone };
                }
            }

            // If we got a success but no phone, maybe it's a different structure?
            if (data.type === 'success' || data.status === 'success') {
                console.warn("[SMS] Token verified but no phone number found in data structure:", data);
            }

        } catch (error) {
            console.error(`[SMS] Error during verification attempt at ${url}:`, error);
        }
    }

    return { success: false, message: "Verification failed on all available endpoints" };
}
