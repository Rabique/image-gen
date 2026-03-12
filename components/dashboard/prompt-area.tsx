"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BorderBeam } from "@/components/ui/border-beam";
import { useAuth } from "@/context/AuthContext";

interface PromptAreaProps {
  onImageGenerated?: (imageData: string, mimeType: string, imageUrl?: string) => void;
  onLoading?: (isLoading: boolean) => void;
  onError?: (error: string | null) => void;
}

export function PromptArea({ onImageGenerated, onLoading, onError }: PromptAreaProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { userProfile, refreshUser } = useAuth();

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    onError?.(null);
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
        await refreshUser();
      }
    } catch (err: any) {
      console.error("Generation error:", err);
      const errorMessage = err.message || "An unexpected error occurred";
      onError?.(errorMessage);
    } finally {
      setIsGenerating(false);
      onLoading?.(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
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
                onKeyDown={handleKeyDown}
                placeholder="Describe your nail art idea..."
                disabled={isGenerating}
                className="w-full h-20 md:h-24 p-6 bg-transparent text-white text-sm md:text-base placeholder:text-neutral-600 focus:outline-none resize-none disabled:opacity-50"
              />

              <div className="flex items-center justify-between p-4 pt-4 border-t border-white/5">
                <div className="flex gap-4 px-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] md:text-xs text-emerald-500 font-bold uppercase tracking-wider">
                      {userProfile?.credits ?? 0} Credits Left
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!prompt.trim() || isGenerating || (userProfile?.credits ?? 0) <= 0}
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
          {["Soft Pink Floral", "Cyberpunk Chrome", "Minimalist French"].map((tag) => (
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
