"use client";

import { useEffect, useRef } from "react";

interface Msg91OtpWidgetProps {
    onSuccess: (data: any) => void;
    onFailure?: (error: any) => void;
}

declare global {
    interface Window {
        configuration?: any;
    }
}

export function Msg91OtpWidget({ onSuccess, onFailure }: Msg91OtpWidgetProps) {
    const widgetRef = useRef<HTMLDivElement>(null);
    const scriptLoadedRef = useRef(false);

    useEffect(() => {
        const widgetId = process.env.NEXT_PUBLIC_MSG91_WIDGET_ID;
        const tokenAuth = process.env.NEXT_PUBLIC_MSG91_TOKEN_AUTH;

        if (!widgetId || !tokenAuth) {
            console.error("MSG91 Widget ID or Token Auth missing");
            return;
        }

        // Setup configuration for MSG91 Widget
        window.configuration = {
            widgetId: widgetId,
            tokenAuth: tokenAuth,
            onSuccess: (data: any) => {
                console.log("MSG91 OTP Success:", data);
                onSuccess(data);
            },
            onFailure: (error: any) => {
                console.error("MSG91 OTP Failure:", error);
                if (onFailure) onFailure(error);
            },
        };

        // Load MSG91 script if not already loaded
        if (!document.getElementById("msg91-otp-script")) {
            const script = document.createElement("script");
            script.id = "msg91-otp-script";
            script.src = "https://control.msg91.com/app/assets/otp-widget/lib/otp-auth-bundle.js";
            script.async = true;
            script.onload = () => {
                scriptLoadedRef.current = true;
            };
            document.body.appendChild(script);
        }

        return () => {
            // Clean up configuration if needed (optional)
            // window.configuration = undefined;
        };
    }, [onSuccess, onFailure]);

    return (
        <div className="w-full flex flex-col items-center">
            {/* The widget will inject itself into a div with id matching its configuration if needed, 
                but usually it finds its own way or we provide a container. 
                According to MSG91 docs for the bundle, it uses window.configuration.
            */}
            <div id={process.env.NEXT_PUBLIC_MSG91_WIDGET_ID} className="msg91-otp-container w-full min-h-[300px]"></div>
        </div>
    );
}
