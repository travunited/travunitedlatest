"use client";

import { useEffect, useRef, useState } from "react";
import { Phone, ArrowRight, Loader2 } from "lucide-react";

interface Msg91OtpWidgetProps {
    onSuccess: (data: any) => void;
    onFailure?: (error: any) => void;
}

declare global {
    interface Window {
        initSendOTP?: (config: any) => void;
        sendOtp?: any;
    }
}

export function Msg91OtpWidget({ onSuccess, onFailure }: Msg91OtpWidgetProps) {
    const [loading, setLoading] = useState(true);
    const [widgetReady, setWidgetReady] = useState(false);
    const [error, setError] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const initAttempted = useRef(false);

    useEffect(() => {
        const widgetId = process.env.NEXT_PUBLIC_MSG91_WIDGET_ID;
        const tokenAuth = process.env.NEXT_PUBLIC_MSG91_TOKEN_AUTH;

        if (!widgetId || !tokenAuth) {
            setError("MSG91 configuration missing. Please contact support.");
            setLoading(false);
            return;
        }

        // Prevent multiple init attempts
        if (initAttempted.current) return;
        initAttempted.current = true;

        const loadScript = () => {
            return new Promise<void>((resolve, reject) => {
                // Check if script is already loaded
                if (document.getElementById("msg91-otp-script")) {
                    resolve();
                    return;
                }

                const script = document.createElement("script");
                script.id = "msg91-otp-script";
                script.src = "https://control.msg91.com/app/assets/otp-provider/otp-provider.js";
                script.async = true;
                script.onload = () => resolve();
                script.onerror = () => reject(new Error("Failed to load MSG91 script"));
                document.body.appendChild(script);
            });
        };

        const initWidget = async () => {
            try {
                await loadScript();

                // Wait a bit for the script to initialize
                await new Promise(resolve => setTimeout(resolve, 500));

                if (window.initSendOTP && containerRef.current) {
                    const configuration = {
                        widgetId: widgetId,
                        tokenAuth: tokenAuth,
                        identifier: "",
                        exposeMethods: true,
                        success: (data: any) => {
                            console.log("MSG91 OTP Success:", data);
                            onSuccess(data);
                        },
                        failure: (error: any) => {
                            console.error("MSG91 OTP Failure:", error);
                            if (onFailure) onFailure(error);
                        },
                    };

                    window.initSendOTP(configuration);
                    setWidgetReady(true);
                } else {
                    setError("Unable to initialize OTP widget. Please try again.");
                }
            } catch (err) {
                console.error("Error initializing MSG91 widget:", err);
                setError("Failed to load OTP service. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        initWidget();

        return () => {
            // Cleanup if needed
        };
    }, [onSuccess, onFailure]);

    if (loading) {
        return (
            <div className="w-full flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600 mb-4" />
                <p className="text-neutral-600 text-sm">Loading OTP service...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full flex flex-col items-center justify-center py-8 px-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                    <p className="text-red-700 text-sm font-medium">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-3 text-primary-600 hover:text-primary-700 text-sm font-semibold"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full" ref={containerRef}>
            {/* MSG91 widget will render here */}
            <div
                id={process.env.NEXT_PUBLIC_MSG91_WIDGET_ID}
                className="msg91-otp-container w-full min-h-[200px]"
            />
            {!widgetReady && (
                <div className="text-center py-8">
                    <p className="text-neutral-500 text-sm">
                        Enter your mobile number to receive OTP
                    </p>
                </div>
            )}
        </div>
    );
}

