"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";

type UserProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  plan: string;
  subscription_status: string;
  credits: number;
  cancel_at_period_end: boolean;
  ends_at: string | null;
};

type AuthContextType = {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create the client outside to prevent re-creation on every render
const supabase = createClient();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchProfile = async (userId: string) => {
    try {
      setProfileLoading(true);
      console.log(`[AuthContext] Fetching profile for ${userId}...`);
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error(`[AuthContext] Error fetching profile:`, error);
        return null;
      }

      if (data) {
        console.log(`[AuthContext] Profile fetched successfully:`, data.plan);
        setUserProfile(data);
        return data;
      }
    } catch (err) {
      console.error("[AuthContext] Unexpected error fetching profile:", err);
    } finally {
      setProfileLoading(false);
    }
    return null;
  };

  const refreshUser = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      setUser(currentUser);
      await fetchProfile(currentUser.id);
    } else {
      setUser(null);
      setUserProfile(null);
    }
  };

  useEffect(() => {
    let profileSubscription: any = null;

    const setupRealtimeSubscription = (userId: string) => {
      if (profileSubscription) {
        supabase.removeChannel(profileSubscription);
      }
      
      console.log(`[AuthContext] Setting up realtime for user ${userId}`);
      
      profileSubscription = supabase
        .channel(`user-profile-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*", // Listen to all events (INSERT, UPDATE, etc.)
            schema: "public",
            table: "users",
            filter: `id=eq.${userId}`,
          },
          (payload) => {
            console.log("[AuthContext] Realtime update received:", payload.eventType, payload.new);
            if (payload.new && Object.keys(payload.new).length > 0) {
              setUserProfile(payload.new as UserProfile);
            } else if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
              // If payload.new is empty (sometimes happens with RLS/Replica Identity), refetch
              fetchProfile(userId);
            }
          }
        )
        .subscribe((status) => {
          console.log(`[AuthContext] Realtime status for ${userId}:`, status);
        });
    };

    // 1. Initial Session Check
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
          await fetchProfile(currentUser.id);
          setupRealtimeSubscription(currentUser.id);
        }
      } catch (error) {
        console.error("Initial auth check error:", error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Safety timeout to ensure loading screen doesn't get stuck
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.warn("Auth initialization taking too long, forcing loading to false");
        setLoading(false);
      }
    }, 3000);

    // 2. Auth State Change Listener
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        await fetchProfile(currentUser.id);
        setupRealtimeSubscription(currentUser.id);
      } else {
        setUserProfile(null);
        if (profileSubscription) {
          supabase.removeChannel(profileSubscription);
          profileSubscription = null;
        }
      }
      setLoading(false);
      clearTimeout(safetyTimeout);
    });

    return () => {
      authSubscription.unsubscribe();
      clearTimeout(safetyTimeout);
      if (profileSubscription) {
        supabase.removeChannel(profileSubscription);
      }
    };
  }, [supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserProfile(null);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, profileLoading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
