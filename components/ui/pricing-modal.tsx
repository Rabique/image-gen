"use client";

import React from "react";
import { Modal } from "./modal";
import { BorderBeam } from "./border-beam";

interface PricingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function PricingModal({ isOpen, onClose }: PricingModalProps) {
    const plans = [
        {
            name: "PRO",
            price: "20",
            credits: "100",
        },
        {
            name: "ULTRA",
            price: "45",
            credits: "300",
        },
    ];

    const [loadingPlan, setLoadingPlan] = React.useState<string | null>(null);

    const handleCheckout = async (planName: string) => {
        try {
            setLoadingPlan(planName);
            const response = await fetch("/api/checkout", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ planName }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                
                if (errorData.error === "ALREADY_SUBSCRIBED") {
                    alert("You already have an active subscription. You can manage, upgrade, or downgrade your plan in the 'Manage Subscription' section of your profile.");
                } else {
                    console.error("Checkout failed:", errorData);
                    alert("Checkout failed. Please try again.");
                }
                return;
            }

            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                alert("Failed to create checkout session.");
            }
        } catch (error) {
            console.error("Error during checkout:", error);
            alert("An error occurred. Please try again.");
        } finally {
            setLoadingPlan(null);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="relative p-1 rounded-[2.5rem] bg-neutral-900/90 backdrop-blur-3xl border border-white/10 shadow-2xl overflow-hidden">
                <BorderBeam duration={12} size={400} />

                <div className="relative z-10 p-4 flex flex-col items-center">
                    <div className="text-center mb-4">
                        <h2 className="text-xl font-bold text-white mb-1 tracking-tight">Simple Pricing</h2>
                        <p className="text-neutral-500 text-xs">Transparent plans for everyone.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-sm">
                        {plans.map((plan) => (
                            <div
                                key={plan.name}
                                className="p-4 rounded-[1.5rem] bg-neutral-950/50 border border-white/5 flex flex-col items-center justify-center text-center space-y-2 relative group"
                            >
                                <span className="text-neutral-500 text-[10px] font-bold uppercase tracking-[0.2em]">
                                    {plan.name}
                                </span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-white">${plan.price}</span>
                                    <span className="text-neutral-500 text-[10px]">/mo</span>
                                </div>
                                <div className="text-emerald-400 font-bold text-sm mb-2">
                                    {plan.credits} Credits
                                </div>
                                <button
                                    onClick={() => handleCheckout(plan.name)}
                                    disabled={loadingPlan !== null}
                                    className="mt-2 w-full px-4 py-2 rounded-full bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loadingPlan === plan.name ? "Redirecting..." : "Get Started"}
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={onClose}
                        className="mt-4 px-4 py-1.5 rounded-full border border-white/10 text-neutral-400 hover:text-white hover:bg-white/5 transition-all text-xs font-medium"
                    >
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    );
}
