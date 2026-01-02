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
        initSendOTP: (configuration: any) => any;
    }
}

const WIDGET_ID = process.env.NEXT_PUBLIC_MSG91_WIDGET_ID || "356c4264755a393237303132";
const TOKEN_AUTH = process.env.NEXT_PUBLIC_MSG91_TOKEN_AUTH || "455112TQr7Dbe2ZlOl6950b0feP1";

const SCRIPT_URLS = [
    'https://verify.msg91.com/otp-provider.js',
    'https://verify.phone91.com/otp-provider.js'
];

export default function Msg91OtpWidget({
    onSuccess,
    onFailure,
    identifier,
    className,
}: Msg91OtpWidgetProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const initializedFor = useRef<string | null>(null);
    const widgetRef = useRef<any>(null);

    useEffect(() => {
        let isMounted = true;

        if (!identifier || identifier.length < 10) {
            setError("Invalid mobile number");
            setIsLoading(false);
            return;
        }

        const normalizedIdentifier = identifier.replace(/\D/g, "");

        // Don't re-initialize if already done for this identifier
        if (initializedFor.current === normalizedIdentifier) {
            setIsLoading(false);
            return;
        }

        const loadScript = (index = 0) => {
            if (index >= SCRIPT_URLS.length) {
                if (isMounted) {
                    setError("Failed to load security module");
                    setIsLoading(false);
                    onFailure?.(new Error("Script load failed"));
                }
                return;
            }

            const existingScript = document.querySelector(`script[src="${SCRIPT_URLS[index]}"]`);
            if (existingScript) {
                checkInit(index);
                return;
            }

            const s = document.createElement("script");
            s.src = SCRIPT_URLS[index];
            s.async = true;
            s.onload = () => checkInit(index);
            s.onerror = () => loadScript(index + 1);
            document.head.appendChild(s);
        };

        const checkInit = (index: number) => {
            if (!isMounted) return;

            if (typeof window.initSendOTP === "function") {
                initWidget();
            } else {
                // Wait for the global function
                setTimeout(() => checkInit(index), 100);
            }
        };

        const initWidget = () => {
            if (!isMounted || !containerRef.current) return;

            try {
                // Clear state
                initializedFor.current = normalizedIdentifier;
                setIsLoading(true);
                setError(null);

                const config = {
                    widgetId: WIDGET_ID,
                    tokenAuth: TOKEN_AUTH,
                    identifier: normalizedIdentifier,
                    success: (data: any) => {
                        console.log("[MSG91] Success:", data);
                        if (isMounted) {
                            setIsLoading(false);
                            onSuccess(data);
                        }
                    },
                    failure: (err: any) => {
                        console.error("[MSG91] Failure:", err);
                        if (isMounted) {
                            setIsLoading(false);
                            onFailure?.(err);
                        }
                    },
                };

                // The widget attaches itself to the DOM. 
                // We provide the configuration which the widget reads.
                widgetRef.current = window.initSendOTP(config);

                setTimeout(() => {
                    if (isMounted) setIsLoading(false);
                }, 1000);

            } catch (err: any) {
                console.error("[MSG91] Init Error:", err);
                if (isMounted) {
                    setError("Verification tool error");
                    setIsLoading(false);
                    onFailure?.(err);
                }
            }
        };

        loadScript();

        return () => {
            isMounted = false;
        };
    }, [identifier, onSuccess, onFailure]);

    return (
        <div className={`${className} min-h-[250px] relative transition-all duration-300`}>
            {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-20 backdrop-blur-sm rounded-xl">
                    <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-sm font-medium text-neutral-600">Initializing secure verification...</p>
                </div>
            )}

            {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 z-20 rounded-xl p-6 text-center">
                    <div className="text-red-500 mb-4">
                        <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="text-red-800 font-semibold mb-2">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="text-sm text-primary-600 font-bold hover:underline"
                    >
                        Click here to retry
                    </button>
                </div>
            )}

            <div
                id="msg91-otp-widget"
                ref={containerRef}
                className="w-full flex justify-center"
            />
        </div>
    );
}
