"use client";

import { motion } from "framer-motion";

interface BorderBeamProps {
    className?: string;
    size?: number;
    duration?: number;
    borderWidth?: number;
    anchor?: number;
    colorFrom?: string;
    colorTo?: string;
    delay?: number;
}

export const BorderBeam = ({
    className,
    size = 200,
    duration = 15,
    anchor = 90,
    borderWidth = 1.5,
    colorFrom = "#3b82f6", // blue-500
    colorTo = "#10b981",   // emerald-500
    delay = 0,
}: BorderBeamProps) => {
    return (
        <div
            style={
                {
                    "--size": `${size}px`,
                    "--duration": `${duration}s`,
                    "--anchor": `${anchor}%`,
                    "--border-width": `${borderWidth}px`,
                    "--color-from": colorFrom,
                    "--color-to": colorTo,
                    "--delay": `-${delay}s`,
                } as React.CSSProperties
            }
            className={`pointer-events-none absolute inset-0 z-10 rounded-[inherit] [border:calc(var(--border-width)*1px)_solid_transparent] ![mask-clip:padding-box,border-box] ![mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)] ${className}`}
        >
            <motion.div
                initial={{ offsetDistance: "0%" }}
                animate={{ offsetDistance: "100%" }}
                transition={{
                    duration: duration,
                    repeat: Infinity,
                    ease: "linear",
                    delay: delay,
                }}
                style={{
                    offsetPath: `rect(0 auto auto 0 round calc(var(--size) * 1px))`,
                    position: "absolute",
                    inset: "0",
                    background: `linear-gradient(to right, var(--color-from), var(--color-to), transparent)`,
                    width: "var(--size)",
                    height: "var(--size)",
                }}
            />
        </div>
    );
};
