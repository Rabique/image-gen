"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar";
import { PromptArea } from "@/components/dashboard/prompt-area";
import { SidebarGallery } from "@/components/dashboard/sidebar-gallery";
import { ImageResult } from "@/components/dashboard/image-result";
import { SparklesCore } from "@/components/ui/sparkles";
import { UniqueLoading } from "@/components/ui/unique-loading";
import { motion, AnimatePresence } from "framer-motion";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

export default function DashboardPage() {
    return (
        <Suspense fallback={
            <div className="h-screen w-full bg-black flex items-center justify-center">
                <div className="text-white text-xl animate-pulse">Loading...</div>
            </div>
        }>
            <DashboardContent />
        </Suspense>
    );
}

function DashboardContent() {
    const { user, loading, refreshUser, userProfile } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isMounted, setIsMounted] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<{ data: string; mimeType: string; imageUrl?: string } | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (isMounted && !loading && !user) {
            router.replace("/auth");
        }
    }, [user, loading, router, isMounted]);

    useEffect(() => {
        if (isMounted && searchParams.get("checkout_success") === "true") {
            setShowSuccess(true);
            refreshUser();
            
            const timer = setTimeout(() => {
                refreshUser();
            }, 2000);

            window.history.replaceState({}, "", window.location.pathname);

            const hideTimer = setTimeout(() => {
                setShowSuccess(false);
            }, 5000);

            return () => {
                clearTimeout(timer);
                clearTimeout(hideTimer);
            };
        }
    }, [searchParams, refreshUser, isMounted]);

    if (!isMounted || loading) {
        return (
            <div className="h-screen w-full bg-black flex items-center justify-center">
                <div className="text-white text-xl animate-pulse font-medium tracking-widest uppercase">Loading ViralAI...</div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="h-screen w-full bg-black relative overflow-hidden">
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-emerald-500/10 border border-emerald-500/20 px-6 py-3 rounded-full backdrop-blur-md flex items-center gap-3"
                    >
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-emerald-400 text-sm font-medium tracking-tight">
                            Payment successful! Your credits have been updated.
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Background Sparkles */}
            <div className="absolute inset-0 w-full h-full pointer-events-none">
                <SparklesCore
                    id="dashboard-sparkles"
                    background="transparent"
                    minSize={0.4}
                    maxSize={1.2}
                    particleDensity={10}
                    className="w-full h-full"
                    particleColor="#10b981"
                />
            </div>

            {/* Sidebar Gallery - Now floating fixed */}
            <SidebarGallery userId={user.id} />

            <DashboardNavbar />

            {/* Main Content Area - Full width */}
            <div className="h-full w-full relative overflow-y-auto custom-scrollbar flex flex-col items-center">
                <main className="relative z-10 w-full pt-20 pb-20 flex flex-col items-center">
                    <div className="w-full max-w-4xl px-8 flex flex-col items-center lg:pl-32">
                        <div className="mb-8 text-center mt-12">
                            <motion.h1
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-xl md:text-3xl font-bold text-white mb-2 tracking-tight"
                            >
                                What are we creating today?
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="text-neutral-500 text-xs md:text-sm uppercase tracking-[0.2em]"
                            >
                                Generate premium thumbnails in seconds.
                            </motion.p>
                        </div>

                        <div className="w-full max-w-lg mx-auto relative">
                            <AnimatePresence mode="popLayout">
                                {isGenerating && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -20, scale: 0.8 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -20, scale: 0.8 }}
                                        className="mb-12 flex justify-center"
                                    >
                                        <UniqueLoading text="Generating magic..." size="md" />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <motion.div layout transition={{ type: "spring", stiffness: 300, damping: 30 }}>
                                <PromptArea
                                    onImageGenerated={(data, mimeType, imageUrl) => setGeneratedImage({ data, mimeType, imageUrl })}
                                    onLoading={setIsGenerating}
                                />
                            </motion.div>
                        </div>

                        {/* Extracted Image Result UI */}
                        <ImageResult
                            image={generatedImage}
                            isGenerating={isGenerating}
                            onClear={() => setGeneratedImage(null)}
                        />
                    </div>
                </main>

                {/* Visual accents */}
                <div className="fixed top-0 right-10 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
                <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                  width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background: rgba(255, 255, 255, 0.05);
                  border-radius: 10px;
                }
            `}</style>
        </div>
    );
}
