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
    const [error, setError] = useState<string | null>(null);
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
                <div className="text-white text-xl animate-pulse font-medium tracking-widest uppercase">Loading Nail Art...</div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="h-screen w-full bg-black relative overflow-hidden flex flex-col">
            {/* New Grid Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
            </div>

            <DashboardNavbar />
            
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="fixed top-24 left-1/2 -translate-x-1/2 z-[110] bg-emerald-500/10 border border-emerald-500/20 px-6 py-3 rounded-full backdrop-blur-md flex items-center gap-3"
                    >
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-emerald-400 text-sm font-medium tracking-tight">
                            Payment successful! Your credits have been updated.
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sidebar Gallery - Floating */}
            <SidebarGallery userId={user.id} />

            {/* Main Content Area */}
            <div className="flex-1 relative overflow-y-auto custom-scrollbar">
                <main className="relative z-10 w-full pt-32 pb-20 flex flex-col items-center">
                    <div className="w-full max-w-4xl px-8 flex flex-col items-center lg:pl-32">
                        <div className="mb-12 text-center">
                            <motion.h1
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tighter"
                            >
                                What nail art are we creating today?
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="text-neutral-500 text-sm md:text-base uppercase tracking-[0.3em] font-medium"
                            >
                                Premium AI Nail Art in Seconds
                            </motion.p>
                        </div>

                        <div className="w-full max-w-xl mx-auto relative">
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
                                {error && !isGenerating && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -20, scale: 0.8 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -20, scale: 0.8 }}
                                        className="mb-12 flex flex-col items-center gap-4"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                                            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </div>
                                        <p className="text-red-500 text-sm font-medium text-center max-w-xs">
                                            {error}
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <motion.div layout transition={{ type: "spring", stiffness: 300, damping: 30 }}>
                                <PromptArea
                                    onImageGenerated={(data, mimeType, imageUrl) => {
                                        setGeneratedImage({ data, mimeType, imageUrl });
                                        setError(null);
                                    }}
                                    onLoading={setIsGenerating}
                                    onError={setError}
                                />
                            </motion.div>
                        </div>

                        <ImageResult
                            image={generatedImage}
                            isGenerating={isGenerating}
                            onClear={() => setGeneratedImage(null)}
                        />
                    </div>
                </main>

                {/* Ambient Accents */}
                <div className="fixed top-0 right-10 w-[600px] h-[600px] bg-red-500/5 blur-[120px] rounded-full pointer-events-none" />
                <div className="fixed bottom-0 left-1/4 w-[600px] h-[600px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />
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
