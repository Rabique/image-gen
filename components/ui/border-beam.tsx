"use client";

import { motion } from "framer-motion";

interface BorderBeamProps {
    className?: string;
    size?: number;
    duration?: number;
    borderWidth?: number;
    colorFrom?: string;
    colorTo?: string;
    delay?: number;
}

export const BorderBeam = ({
    className,
    size = 200,
    duration = 15,
    borderWidth = 1.5,
    colorFrom = "#3b82f6",
    colorTo = "#10b981",
    delay = 0,
}: BorderBeamProps) => {
    return (
        <div
            className={`pointer-events-none absolute inset-0 z-10 rounded-[inherit] ${className}`}
            style={{
                padding: borderWidth,
            }}
        >
            <div className="relative h-full w-full overflow-hidden rounded-[inherit]">
                <motion.div
                    animate={{
                        rotate: [0, 360],
                    }}
                    transition={{
                        duration: duration,
                        repeat: Infinity,
                        ease: "linear",
                        delay: -delay,
                    }}
                    style={{
                        position: "absolute",
                        top: "-50%",
                        left: "-50%",
                        width: "200%",
                        height: "200%",
                        background: `conic-gradient(from 0deg, transparent 0deg, ${colorFrom} 90deg, ${colorTo} 180deg, transparent 270deg)`,
                    }}
                />
                <div className="absolute inset-x-0 inset-y-0 m-auto h-[calc(100%-var(--border-width))] w-[calc(100%-var(--border-width))] bg-neutral-950 rounded-[inherit]"
                    style={{
                        "--border-width": `${borderWidth * 2}px`,
                        margin: `${borderWidth}px`
                    } as any}
                />
            </div>
        </div>
    );
};
