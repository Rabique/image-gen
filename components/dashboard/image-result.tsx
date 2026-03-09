"use client"

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ImageResultProps {
    image: {
        data: string;
        mimeType: string;
        imageUrl?: string;
    } | null;
    isGenerating: boolean;
    onClear: () => void;
}

export function ImageResult({ image, isGenerating, onClear }: ImageResultProps) {
    return (
        <AnimatePresence mode="wait">
            {image && !isGenerating && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 40 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="mt-16 w-full max-w-4xl mx-auto"
                >
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600/50 to-lime-600/50 rounded-3xl blur opacity-25"></div>
                        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-neutral-900/50 backdrop-blur-xl p-4 shadow-2xl">
                            <div className="relative group">
                                <img
                                    src={image.imageUrl || `data:${image.mimeType};base64,${image.data}`}
                                    alt="Generated Thumbnail"
                                    className="w-full rounded-xl shadow-2xl object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                    <a
                                        href={image.imageUrl || `data:${image.mimeType};base64,${image.data}`}
                                        download="thumbnail.png"
                                        className="px-6 py-3 rounded-full bg-white text-black font-bold hover:scale-105 transition-transform"
                                    >
                                        Download
                                    </a>
                                    <button
                                        onClick={onClear}
                                        className="px-6 py-3 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 font-bold hover:bg-white/20 transition-all"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
