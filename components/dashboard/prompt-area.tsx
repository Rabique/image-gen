"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BorderBeam } from "@/components/ui/border-beam";

interface PromptAreaProps {
  onImageGenerated?: (imageData: string, mimeType: string, imageUrl?: string) => void;
  onLoading?: (isLoading: boolean) => void;
}

export function PromptArea({ onImageGenerated, onLoading }: PromptAreaProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    onLoading?.(true);

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate image");
      }

      if (data.imageData) {
        onImageGenerated?.(data.imageData, data.mimeType, data.imageUrl);
      }
    } catch (err: any) {
      console.error("Generation error:", err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsGenerating(false);
      onLoading?.(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative"
      >
        <form onSubmit={handleSubmit} className="relative group">
          <div className="relative flex flex-col p-1.5 rounded-[1.2rem] bg-neutral-900/90 border border-white/10 backdrop-blur-3xl shadow-2xl overflow-hidden">
            <BorderBeam duration={12} size={300} />

            <div className="relative z-20 flex flex-col">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your video idea..."
                disabled={isGenerating}
                className="w-full h-20 md:h-24 p-6 bg-transparent text-white text-sm md:text-base placeholder:text-neutral-600 focus:outline-none resize-none disabled:opacity-50"
              />

              {error && (
                <div className="px-8 py-2 text-red-500 text-sm">
                  Error: {error}
                </div>
              )}

              <div className="flex items-center justify-between p-4 pt-4 border-t border-white/5">
                <div className="flex gap-4 px-2">
                  <button type="button" className="text-neutral-500 hover:text-white transition-colors p-2" disabled={isGenerating}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </button>
                  <button type="button" className="text-neutral-500 hover:text-white transition-colors p-2" disabled={isGenerating}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="22" />
                    </svg>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={!prompt.trim() || isGenerating}
                  className="group relative flex items-center justify-center gap-3 px-8 py-3 rounded-2xl bg-sky-500 hover:bg-sky-600 disabled:bg-neutral-800 disabled:text-neutral-600 text-white font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-sky-500/20 min-w-[140px]"
                >
                  <AnimatePresence mode="wait">
                    {isGenerating ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-2"
                      >
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span className="text-sm">Thinking...</span>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="idle"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-2"
                      >
                        <span className="text-sm">Generate</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 group-hover:translate-x-1 transition-transform">
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            </div>
          </div>
        </form>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <span className="text-neutral-500 text-sm font-medium">Suggestions:</span>
          {["Gaming High-Intensity", "Minimalist Tech Review", "Fitness Transformation"].map((tag) => (
            <button
              key={tag}
              onClick={() => setPrompt(tag)}
              disabled={isGenerating}
              className="px-4 py-2 rounded-full border border-white/5 bg-white/5 text-neutral-400 text-sm hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
            >
              {tag}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
