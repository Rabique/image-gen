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
                                className="p-4 rounded-[1.5rem] bg-neutral-950/50 border border-white/5 flex flex-col items-center justify-center text-center space-y-2"
                            >
                                <span className="text-neutral-500 text-[10px] font-bold uppercase tracking-[0.2em]">
                                    {plan.name}
                                </span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-white">${plan.price}</span>
                                    <span className="text-neutral-500 text-[10px]">/mo</span>
                                </div>
                                <div className="text-emerald-400 font-bold text-sm">
                                    {plan.credits} Credits
                                </div>
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
