"use client";
import React from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { usePathname, useRouter } from "next/navigation";

export function Navbar() {
  const { user, signOut, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/dashboard") return null;

  const handleDashboardClick = () => {
    if (loading) return;
    router.push("/dashboard");
  };

  return (
    <nav className="fixed top-0 inset-x-0 z-[100] border-b border-white/10 bg-black/50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group pointer-events-auto">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform">
            <svg
              viewBox="0 0 24 24"
              fill="white"
              className="w-5 h-5"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">ViralAI</span>
        </Link>

        {/* Center Links */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="#features" className="text-neutral-400 hover:text-white transition-colors text-sm font-medium">
            Features
          </Link>
          <Link href="#pricing" className="text-neutral-400 hover:text-white transition-colors text-sm font-medium">
            Pricing
          </Link>
          <Link href="#contact" className="text-neutral-400 hover:text-white transition-colors text-sm font-medium">
            Contact
          </Link>
        </div>

        {/* Right Action */}
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <button 
                onClick={handleDashboardClick}
                disabled={loading}
                className="text-neutral-400 hover:text-white transition-colors text-sm font-medium disabled:opacity-50"
              >
                Dashboard
              </button>
              <button
                onClick={() => signOut()}
                className="px-5 py-2 rounded-full border border-white/10 text-white text-sm font-bold hover:bg-white/5 transition-colors"
              >
                Sign Out
              </button>
              {user.user_metadata.avatar_url && (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="User Avatar"
                  className="w-8 h-8 rounded-full border border-white/20"
                />
              )}
            </>
          ) : (
            <Link href="/auth">
              <button className="px-5 py-2 rounded-full bg-white text-black text-sm font-bold hover:bg-neutral-200 transition-colors">
                Get Started
              </button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

