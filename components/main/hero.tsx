"use client";
import React from "react";
import { SparklesCore } from "../ui/sparkles";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export function Hero() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleButtonClick = () => {
    if (loading) return;
    const targetPath = user ? "/dashboard" : "/auth";
    router.push(targetPath);
  };

  return (
    <div className="h-screen relative w-full bg-black flex flex-col items-center justify-center overflow-hidden">
      <div className="w-full absolute inset-0 h-screen pointer-events-none">
        <SparklesCore
          id="tsparticlesfullpage"
          background="transparent"
          minSize={0.6}
          maxSize={1.4}
          particleDensity={100}
          className="w-full h-full"
          particleColor="#FF0000" // YouTube Red
        />
      </div>

      <div className="relative z-[50] flex flex-col items-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="md:text-7xl text-3xl lg:text-8xl font-bold text-center text-white"
        >
          Viral Thumbnails <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">
            Powered by AI
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-neutral-400 text-center max-w-lg mt-6 text-sm md:text-xl"
        >
          Transform your video ideas.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-10 relative z-[9999] pointer-events-auto"
        >
          <button 
            onClick={handleButtonClick}
            disabled={loading}
            className="px-8 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold transition-all duration-200 transform hover:scale-105 shadow-[0_0_20px_rgba(220,38,38,0.5)] cursor-pointer disabled:opacity-50 active:scale-95"
          >
            {user ? "Go to Dashboard" : "Create Your First Thumbnail"}
          </button>
        </motion.div>
      </div>

      <div className="w-[40rem] h-40 relative mt-10">
        {/* Gradients */}
        <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-red-500 to-transparent h-[2px] w-3/4 blur-sm" />
        <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-red-500 to-transparent h-px w-3/4" />
        <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-orange-500 to-transparent h-[5px] w-1/4 blur-sm" />
        <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-orange-500 to-transparent h-px w-1/4" />

        {/* Core component */}
        <SparklesCore
          background="transparent"
          minSize={0.4}
          maxSize={1}
          particleDensity={1200}
          className="w-full h-full [mask-image:radial-gradient(350px_200px_at_top,transparent_20%,white)]"
          particleColor="#FF0000"
        />

        {/* Radial Gradient to prevent sharp edges */}
        <div className="absolute inset-0 w-full h-full bg-black [mask-image:radial-gradient(350px_200px_at_top,transparent_20%,white)]"></div>
      </div>
    </div>
  );
}
