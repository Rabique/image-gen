"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar";
import { PromptArea } from "@/components/dashboard/prompt-area";
import { SparklesCore } from "@/components/ui/sparkles";

export default function DashboardPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push("/auth");
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="h-screen w-full bg-black flex items-center justify-center">
                <div className="text-white text-xl animate-pulse">Loading...</div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen w-full bg-black relative flex flex-col items-center justify-center overflow-hidden">
            {/* Background Sparkles */}
            <div className="absolute inset-0 w-full h-full pointer-events-none">
                <SparklesCore
                    id="dashboard-sparkles"
                    background="transparent"
                    minSize={0.4}
                    maxSize={1.2}
                    particleDensity={30}
                    className="w-full h-full"
                    particleColor="#FF0000"
                />
            </div>

            <DashboardNavbar />

            <main className="relative z-10 w-full pt-20">
                <div className="flex flex-col items-center justify-center">
                    <div className="mb-12 text-center px-4">
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                            What are we creating today?
                        </h1>
                        <p className="text-neutral-500 text-lg">
                            Generate high-conversion thumbnails in seconds.
                        </p>
                    </div>

                    <PromptArea />
                </div>
            </main>

            {/* Background Gradients */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-600/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-600/10 blur-[120px] rounded-full pointer-events-none" />
        </div>
    );
}
