"use client";

import { useEffect, useRef, useState } from "react";

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
    const [isLoading, setIsLoading] = useState(true);
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
                    identifier: identifier || "",
                    success: (data: any) => {
                        console.log("[MSG91] Widget Success:", data);
                        if (isMounted) onSuccess(data);
                    },
                    failure: (error: any) => {
                        console.error("[MSG91] Widget Failure:", error);
                        // Delay failure handling to allow widget to close properly
                        setTimeout(() => {
                            if (isMounted && onFailure) onFailure(error);
                        }, 100);
                    },
                };

                window.initSendOTP(window.configuration);

                // Hide loader after a short delay to allow widget to paint
                setTimeout(() => {
                    if (isMounted) setIsLoading(false);
                }, 500);
            }
        };

        // Reset initialization flag and loading state on identifier change
        initializing.current = false;
        setIsLoading(true);

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
                    if (isMounted) setIsLoading(false);
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
        <div key={identifier} className={`${className} min-h-[200px] relative`}>
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white z-10 rounded-lg">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
            )}
            <div id="msg91-otp-widget" ref={containerRef} />
        </div>
    );
}
