"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { PricingModal } from "@/components/ui/pricing-modal";

export function DashboardNavbar() {
  const { user, userProfile, profileLoading, signOut } = useAuth();
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
  const [isPricingOpen, setIsPricingOpen] = React.useState(false);
  const [isPortalLoading, setIsPortalLoading] = React.useState(false);

  const handleManageSubscription = async () => {
    try {
      setIsPortalLoading(true);
      const response = await fetch("/api/portal", { method: "POST" });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        const errorMessage = data.error || "Please try again later.";
        console.error("Portal Error:", errorMessage);
        
        if (response.status === 404) {
          alert("No active subscription found. Please subscribe to a plan first!");
          setIsPricingOpen(true); // 구독창을 대신 열어줌
        } else {
          alert(`Billing portal error: ${errorMessage}`);
        }
      }
    } catch (error) {
      console.error("Error opening portal:", error);
    } finally {
      setIsPortalLoading(false);
    }
  };

  return (
    <>
      <nav className="fixed top-6 left-6 right-6 z-[100] flex items-center justify-between pointer-events-none bg-transparent">
        {/* Left Logo - Independent Floating Button */}
        <Link href="/" className="pointer-events-auto">
          <div className="flex items-center gap-3 px-4 py-2 rounded-2xl border border-white/10 bg-neutral-900/40 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:border-white/20 transition-all group">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform shadow-[0_0_15px_rgba(220,38,38,0.4)]">
              <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </div>
            <span className="text-white font-bold text-lg tracking-tight pr-2">ViralAI</span>
          </div>
        </Link>

        {/* Right Profile Popover - Independent Floating Button */}
        <div 
          className="relative pointer-events-auto"
          onMouseEnter={() => setIsPopoverOpen(true)}
          onMouseLeave={() => setIsPopoverOpen(false)}
        >
          <button className="flex items-center gap-2 p-1 pr-4 rounded-2xl border border-white/10 bg-neutral-900/40 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:border-white/20 transition-all overflow-hidden group">
            {user?.user_metadata.avatar_url ? (
              <img 
                src={user.user_metadata.avatar_url} 
                alt="Profile" 
                className="w-10 h-10 rounded-xl object-cover border border-white/10 group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-white/10 flex items-center justify-center text-white font-bold">
                {user?.email?.[0].toUpperCase()}
              </div>
            )}
            <div className="flex flex-col items-start px-1">
              <span className="text-white text-sm font-semibold truncate max-w-[100px]">
                {user?.user_metadata.full_name || "Creator"}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-500 text-[10px] uppercase tracking-wider font-bold">
                  {profileLoading ? "..." : (userProfile?.plan || "FREE")}
                </span>
                {userProfile?.subscription_status === "refunded" && (
                  <span className="text-[8px] bg-red-500/20 text-red-400 px-1 rounded-sm font-bold uppercase">Refunded</span>
                )}
                {userProfile?.cancel_at_period_end && (
                  <span className="text-[8px] bg-orange-500/20 text-orange-400 px-1 rounded-sm font-bold uppercase">Canceled</span>
                )}
              </div>
            </div>
          </button>

          <AnimatePresence>
            {isPopoverOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 top-full mt-4 w-52 p-2 rounded-[1.5rem] border border-white/10 bg-neutral-900/60 backdrop-blur-3xl shadow-2xl overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-white/5 mb-1">
                  <p className="text-[10px] items-center uppercase tracking-[0.2em] font-bold text-neutral-500 mb-1">Account</p>
                  <p className="text-xs text-white truncate font-medium">{user?.email}</p>
                  {userProfile?.ends_at && (
                    <p className="text-[9px] text-neutral-500 mt-1">
                      {userProfile.cancel_at_period_end ? "Ends on: " : "Renews on: "}
                      {new Date(userProfile.ends_at).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div className="px-4 py-3 border-b border-white/5 mb-1 bg-emerald-500/5">
                  <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-emerald-500 mb-1">Credits</p>
                  <p className="text-sm text-white font-bold">{userProfile?.credits ?? 0}</p>
                </div>

                <div className="space-y-1">
                  <button 
                    onClick={() => {
                      setIsPricingOpen(true);
                      setIsPopoverOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-neutral-400 hover:text-white transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center group-hover:bg-sky-500/20 group-hover:text-sky-400 transition-colors">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                      </svg>
                    </div>
                    <span className="text-sm font-bold">Upgrade</span>
                  </button>

                  {userProfile?.plan !== "FREE" && (
                    <button 
                      onClick={handleManageSubscription}
                      disabled={isPortalLoading}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-neutral-400 hover:text-white transition-all group disabled:opacity-50"
                    >
                      <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center group-hover:bg-purple-500/20 group-hover:text-purple-400 transition-colors">
                        {isPortalLoading ? (
                          <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                            <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm font-bold">Manage Subscription</span>
                    </button>
                  )}

                  <button 
                    onClick={() => signOut()}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 text-neutral-400 hover:text-red-500 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                    </div>
                    <span className="text-sm font-bold">Sign Out</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      <PricingModal isOpen={isPricingOpen} onClose={() => setIsPricingOpen(false)} />
    </>
  );
}
