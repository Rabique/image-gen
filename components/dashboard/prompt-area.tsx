"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PromptAreaProps {
  onImageGenerated?: (imageData: string, mimeType: string, imageUrl?: string) => void;
  onLoading?: (isLoading: boolean) => void;
}

export function PromptArea({ onImageGenerated, onLoading }: PromptAreaProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<{ file: File; preview: string }[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const MAX_FILES = 10;
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setError(null);

    // Filter out duplicates and check limits
    const newAttachments = [...attachments];
    let hasError = false;

    files.forEach(file => {
      if (newAttachments.length >= MAX_FILES) {
        setError(`Maximum ${MAX_FILES} images allowed`);
        hasError = true;
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError(`File ${file.name} exceeds 5MB limit`);
        hasError = true;
        return;
      }

      const preview = URL.createObjectURL(file);
      newAttachments.push({ file, preview });
    });

    setAttachments(newAttachments);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const newArr = [...prev];
      URL.revokeObjectURL(newArr[index].preview);
      newArr.splice(index, 1);
      return newArr;
    });
  };

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
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-lime-600 rounded-[1.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative flex flex-col p-1.5 rounded-[1.2rem] bg-neutral-900/90 border border-white/10 backdrop-blur-3xl shadow-2xl">

            {/* Attachment Previews */}
            <AnimatePresence>
              {attachments.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex gap-2 p-3 pb-0 overflow-x-auto custom-scrollbar"
                >
                  {attachments.map((att, i) => (
                    <motion.div
                      key={att.preview}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="relative flex-shrink-0"
                    >
                      <img src={att.preview} className="w-14 h-14 rounded-lg object-cover border border-white/10" />
                      <button
                        type="button"
                        onClick={() => removeAttachment(i)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors shadow-lg"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your video idea..."
              disabled={isGenerating}
              className="w-full h-10 md:h-12 p-3 bg-transparent text-white text-sm md:text-base placeholder:text-neutral-600 focus:outline-none resize-none disabled:opacity-50"
            />

            {error && (
              <div className="px-4 py-2 text-red-500 text-xs font-medium">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between p-4 pt-0">
              <div className="flex gap-4 px-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-neutral-500 hover:text-white transition-colors p-1"
                  disabled={isGenerating}
                  title="Attach images (Max 10, 5MB each)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </button>
                <button type="button" className="text-neutral-500 hover:text-white transition-colors" disabled={isGenerating}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                </button>
              </div>

              <button
                type="submit"
                disabled={!prompt.trim() || isGenerating}
                className="group relative flex items-center justify-center gap-3 px-8 py-4 rounded-3xl bg-sky-400 hover:bg-sky-500 disabled:bg-sky-950/40 disabled:text-white/40 text-white font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-sky-400/30 min-w-[140px]"
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
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Thinking...</span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-2"
                    >
                      <span>Generate</span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 group-hover:translate-x-1 transition-transform">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
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
