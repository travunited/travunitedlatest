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
    const initializing = useRef(false);

    useEffect(() => {
        let isMounted = true;

        const initWidget = () => {
            if (!isMounted || !containerRef.current || initializing.current) return;

            if (typeof window.initSendOTP === "function") {
                console.log("[MSG91] Initializing widget with identifier:", identifier);
                initializing.current = true;

                // Clear container before initialization
                containerRef.current.innerHTML = "";

                window.configuration = {
                    widgetId: WIDGET_ID,
                    tokenAuth: TOKEN_AUTH,
                    tokenAuth: TOKEN_AUTH,
                    identifier: identifier || "",
                    success: (data: any) => {
                        console.log("[MSG91] Widget Success:", data);
                        if (isMounted) onSuccess(data);
                    },
                    failure: (error: any) => {
                        console.error("[MSG91] Widget Failure:", error);
                        if (isMounted && onFailure) onFailure(error);
                    },
                };

                window.initSendOTP(window.configuration);
            }
        };

        // Reset initialization flag on identifier change
        initializing.current = false;

        if (typeof window.initSendOTP === "function") {
            initWidget();
        } else {
            // Load script only once
            if (!document.querySelector(`script[src*="otp-provider.js"]`)) {
                const s = document.createElement("script");
                s.src = "https://control.msg91.com/app/assets/otp-provider/otp-provider.js";
                s.async = true;
                s.onload = () => { if (isMounted) initWidget(); };
                s.onerror = (e) => {
                    console.error("[MSG91] Script load error:", e);
                    if (isMounted && onFailure) onFailure(new Error("Failed to load OTP widget"));
                };
                document.head.appendChild(s);
            } else {
                // Wait for global function to be available
                const interval = setInterval(() => {
                    if (typeof window.initSendOTP === "function") {
                        clearInterval(interval);
                        if (isMounted) initWidget();
                    }
                }, 100);
                return () => {
                    clearInterval(interval);
                    isMounted = false;
                };
            }
        }

        return () => {
            isMounted = false;
        };
    }, [onSuccess, onFailure, identifier]);

    return (
        <div key={identifier} className={className}>
            <div id="msg91-otp-widget" ref={containerRef} />
        </div>
    );
}
