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

const WIDGET_ID = process.env.NEXT_PUBLIC_MSG91_WIDGET_ID || "356c4264755a393237303132";
const TOKEN_AUTH = process.env.NEXT_PUBLIC_MSG91_TOKEN_AUTH || "455112TQr7Dbe2ZlOl6950b0feP1";

export default function Msg91OtpWidget({
    onSuccess,
    onFailure,
    identifier,
    className,
}: Msg91OtpWidgetProps) {
    const [isLoading, setIsLoading] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const initializing = useRef(false);
    const widgetInstance = useRef<any>(null);

    useEffect(() => {
        let isMounted = true;

        // Validate identifier before proceeding
        if (!identifier || identifier.length < 10) {
            console.warn("[MSG91] Invalid identifier:", identifier);
            if (isMounted && onFailure) {
                onFailure(new Error("Please enter a valid mobile number"));
            }
            if (isMounted) setIsLoading(false);
            return;
        }

        // Normalize identifier - ensure it's a valid phone number
        const normalizedIdentifier = identifier.replace(/\D/g, "");
        if (normalizedIdentifier.length < 10 || normalizedIdentifier.length > 12) {
            console.warn("[MSG91] Invalid identifier format:", identifier);
            if (isMounted && onFailure) {
                onFailure(new Error("Please enter a valid 10-digit mobile number"));
            }
            if (isMounted) setIsLoading(false);
            return;
        }

        const initWidget = () => {
            if (!isMounted || !containerRef.current || initializing.current) return;

            if (typeof window.initSendOTP === "function") {
                console.log("[MSG91] Initializing widget with identifier:", normalizedIdentifier);
                initializing.current = true;

                try {
                    // Clear container before initialization
                    if (containerRef.current) {
                        containerRef.current.innerHTML = "";
                    }

                    window.configuration = {
                        widgetId: WIDGET_ID,
                        tokenAuth: TOKEN_AUTH,
                        identifier: normalizedIdentifier,
                        success: (data: any) => {
                            console.log("[MSG91] Widget Success:", data);
                            if (isMounted) {
                                setIsLoading(false);
                                onSuccess(data);
                            }
                        },
                        failure: (error: any) => {
                            console.error("[MSG91] Widget Failure:", error);
                            if (isMounted) {
                                setIsLoading(false);
                                // Delay failure handling to allow widget to close properly
                                setTimeout(() => {
                                    if (isMounted && onFailure) {
                                        onFailure(error);
                                    }
                                }, 100);
                            }
                        },
                    };

                    widgetInstance.current = window.initSendOTP(window.configuration);

                    // Hide loader after a short delay to allow widget to paint
                    setTimeout(() => {
                        if (isMounted) setIsLoading(false);
                    }, 500);
                } catch (error: any) {
                    console.error("[MSG91] Widget initialization error:", error);
                    if (isMounted) {
                        setIsLoading(false);
                        if (onFailure) {
                            onFailure(error);
                        }
                    }
                }
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
                s.onload = () => {
                    if (isMounted) {
                        // Wait a bit for the script to fully initialize
                        setTimeout(() => {
                            if (isMounted) initWidget();
                        }, 100);
                    }
                };
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
                        if (isMounted) {
                            setTimeout(() => {
                                if (isMounted) initWidget();
                            }, 100);
                        }
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
            initializing.current = false;
            // Clean up widget instance if it exists
            if (containerRef.current) {
                containerRef.current.innerHTML = "";
            }
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
