"use client"

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

interface Thumbnail {
    id: string;
    image_url: string;
    prompt: string;
    created_at: string;
}

export function SidebarGallery({ userId }: { userId?: string }) {
    const [thumbnails, setThumbnails] = useState<Thumbnail[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    const fetchThumbnails = async () => {
        if (!userId) {
            // If userId isn't passed, try to get it from the session
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }
        }

        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("thumbnails")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setThumbnails(data || []);
        } catch (err) {
            console.error("Error fetching thumbnails:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchThumbnails();

        const channel = supabase
            .channel("thumbnails_realtime")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "thumbnails" },
                (payload) => {
                    // Verify the new record belongs to the current user (if known)
                    if (userId && (payload.new as Thumbnail & { user_id: string }).user_id !== userId) return;
                    setThumbnails((prev) => [payload.new as Thumbnail, ...prev]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    return (
        <aside className="fixed left-6 top-1/2 -translate-y-1/2 w-32 h-[75vh] bg-[#202020]/60 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] flex flex-col overflow-hidden shadow-[0_0_50px_-12px_rgba(0,0,0,0.8)] z-[100] group/sidebar hover:bg-[#202020]/80 transition-all duration-500">
            {/* Liquid Glass Accents */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-blue-500/20 to-transparent" />
                <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-emerald-500/20 to-transparent" />
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-8 custom-scrollbar relative z-10">
                <div className="flex flex-col gap-4">
                    {loading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="aspect-square bg-white/5 rounded-3xl animate-pulse border border-white/5" />
                        ))
                    ) : thumbnails.length === 0 ? (
                        <div className="h-40 flex flex-col items-center justify-center text-center">
                            <p className="text-neutral-500 text-[10px] font-bold uppercase tracking-[0.2em] opacity-30">Gallery Empty</p>
                        </div>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {thumbnails.map((thumbnail) => (
                                <motion.div
                                    key={thumbnail.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.8, y: 10 }}
                                    className="group relative aspect-square rounded-[1.5rem] overflow-hidden border border-white/10 bg-neutral-900 shadow-xl hover:border-emerald-500/30 transition-all duration-500"
                                >
                                    <img
                                        src={thumbnail.image_url}
                                        alt={thumbnail.prompt}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        loading="lazy"
                                    />

                                    {/* Hover Overlay */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-sm">
                                        <a
                                            href={thumbnail.image_url}
                                            download={`thumbnail-${thumbnail.id}.png`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-2.5 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 hover:scale-110 transition-all shadow-lg shadow-emerald-500/20"
                                            title="Download"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
                                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                                <polyline points="7 10 12 15 17 10" />
                                                <line x1="12" y1="15" x2="12" y2="3" />
                                            </svg>
                                        </a>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}
                </div>
            </div>

            <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
        </aside>
    );
}
