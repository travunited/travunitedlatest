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
    const initialized = useRef(false);

    useEffect(() => {
        // Function to initialize or re-initialize the widget
        const initWidget = () => {
            if (typeof window.initSendOTP === "function") {
                console.log("[MSG91] Initializing widget with identifier:", identifier);

                // Clear container before initialization to prevent duplicates
                if (containerRef.current) {
                    containerRef.current.innerHTML = "";
                }

                window.configuration = {
                    widgetId: WIDGET_ID,
                    tokenAuth: TOKEN_AUTH,
                    identifier: identifier || "",
                    exposeMethods: true,
                    success: (data: any) => {
                        console.log("[MSG91] Widget Success:", data);
                        onSuccess(data);
                    },
                    failure: (error: any) => {
                        console.error("[MSG91] Widget Failure:", error);
                        if (onFailure) onFailure(error);
                    },
                };

                window.initSendOTP(window.configuration);
                initialized.current = true;
            }
        };

        // If script is already loaded and function is available
        if (typeof window.initSendOTP === "function") {
            initWidget();
            return;
        }

        // Otherwise load script
        const s = document.createElement("script");
        s.src = "https://control.msg91.com/app/assets/otp-provider/otp-provider.js";
        s.async = true;
        s.onload = initWidget;
        s.onerror = (e) => {
            console.error("[MSG91] Script load error:", e);
            if (onFailure) onFailure(new Error("Failed to load OTP widget"));
        };
        document.head.appendChild(s);

        return () => {
            // Cleanup: remove global configuration if needed, though usually fine to keep
            // initialized.current = false;
        };
    }, [onSuccess, onFailure, identifier]);

    return (
        <div key={identifier} className={className}>
            <div id="msg91-otp-widget" ref={containerRef} />
        </div>
    );
}
