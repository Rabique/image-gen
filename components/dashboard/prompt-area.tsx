"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

export function PromptArea() {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Generating with prompt:", prompt);
    // Logic for thumbnail generation will go here
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
          <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-orange-600 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative flex flex-col p-2 rounded-[2.2rem] bg-neutral-900/90 border border-white/10 backdrop-blur-3xl shadow-2xl">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your video idea to generate a viral thumbnail..."
              className="w-full h-48 md:h-64 p-8 bg-transparent text-white text-xl md:text-2xl placeholder:text-neutral-600 focus:outline-none resize-none"
            />
            
            <div className="flex items-center justify-between p-4 pt-0">
              <div className="flex gap-4 px-4">
                <button type="button" className="text-neutral-500 hover:text-white transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </button>
                <button type="button" className="text-neutral-500 hover:text-white transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                </button>
              </div>

              <button
                type="submit"
                disabled={!prompt.trim()}
                className="group flex items-center gap-3 px-8 py-4 rounded-3xl bg-red-600 hover:bg-red-700 disabled:bg-neutral-800 disabled:text-neutral-600 text-white font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-red-600/20"
              >
                <span>Generate</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 group-hover:translate-x-1 transition-transform">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
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
              className="px-4 py-2 rounded-full border border-white/5 bg-white/5 text-neutral-400 text-sm hover:bg-white/10 hover:text-white transition-all"
            >
              {tag}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
