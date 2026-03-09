"use client";

import React from "react";
import { Modal } from "./modal";
import { BorderBeam } from "./border-beam";
import { motion } from "framer-motion";

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
            color: "from-blue-500 to-emerald-500",
            delay: 0,
        },
        {
            name: "ULTRA",
            price: "45",
            credits: "300",
            color: "from-purple-500 to-pink-500",
            delay: 5,
        },
    ];

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="p-8 bg-neutral-900/90 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden relative">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Upgrade Your Plan</h2>
                    <p className="text-neutral-500 text-sm">Choose the perfect plan for your creative needs.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                    {plans.map((plan) => (
                        <div
                            key={plan.name}
                            className="relative group p-8 rounded-[2rem] bg-neutral-950 border border-white/5 flex flex-col items-center justify-center transition-all hover:scale-[1.02]"
                        >
                            <BorderBeam delay={plan.delay} duration={12} size={300} />

                            <span className="text-neutral-500 text-xs font-bold uppercase tracking-[0.2em] mb-4">
                                {plan.name}
                            </span>

                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-4xl font-bold text-white">${plan.price}</span>
                                <span className="text-neutral-500 text-sm font-medium">/mo</span>
                            </div>

                            <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 mb-8 w-full text-center">
                                <span className="text-white font-bold text-lg">{plan.credits}</span>
                                <span className="text-neutral-500 ml-2 text-sm uppercase tracking-wider">Credits</span>
                            </div>

                            <button
                                className={`w-full py-4 rounded-2xl bg-gradient-to-r ${plan.color} text-white font-bold transition-all hover:opacity-90 active:scale-95 shadow-lg`}
                            >
                                Choose {plan.name}
                            </button>
                        </div>
                    ))}
                </div>

                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-full border border-white/5 bg-white/5 text-neutral-500 hover:text-white transition-all"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>
        </Modal>
    );
}
