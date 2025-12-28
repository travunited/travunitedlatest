"use client";

import { useEffect, useRef } from "react";

interface Msg91OtpWidgetProps {
    onSuccess: (data: any) => void;
    onFailure?: (error: any) => void;
    identifier?: string;
    className?: string;
}

declare global {
    interface Window {
        initSendOTP: (configuration: any) => void;
        configuration: any;
    }
}

const WIDGET_ID = "356c4264755a393237303132";
const TOKEN_AUTH = "455112TQr7Dbe2ZlOl6950b0feP1";

export default function Msg91OtpWidget({
    onSuccess,
    onFailure,
    identifier,
    className,
}: Msg91OtpWidgetProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const scriptLoaded = useRef(false);

    useEffect(() => {
        if (scriptLoaded.current) return;

        window.configuration = {
            widgetId: WIDGET_ID,
            tokenAuth: TOKEN_AUTH,
            identifier: identifier || "",
            exposeMethods: true,
            success: (data: any) => {
                console.log("MSG91 Widget Success:", data);
                onSuccess(data);
            },
            failure: (error: any) => {
                console.log("MSG91 Widget Failure:", error);
                if (onFailure) onFailure(error);
            },
        };

        const loadScript = (urls: string[]) => {
            let i = 0;
            const attempt = () => {
                if (i >= urls.length) return;
                const s = document.createElement("script");
                s.src = urls[i];
                s.async = true;
                s.onload = () => {
                    if (typeof window.initSendOTP === "function") {
                        window.initSendOTP(window.configuration);
                    }
                };
                s.onerror = () => {
                    i++;
                    attempt();
                };
                document.head.appendChild(s);
            };
            attempt();
        };

        loadScript([
            "https://verify.msg91.com/otp-provider.js",
            "https://verify.phone91.com/otp-provider.js",
        ]);

        scriptLoaded.current = true;
    }, [onSuccess, onFailure, identifier]);

    return <div id="msg91-otp-widget" ref={containerRef} className={className} />;
}
