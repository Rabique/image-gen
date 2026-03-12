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
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (!error && data) {
      setUserProfile(data);
      return data;
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

    const setupRealtimeSubscription = (userId: string) => {
      if (profileSubscription) return;
      
      profileSubscription = supabase
        .channel(`public:users:id=eq.${userId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "users",
            filter: `id=eq.${userId}`,
          },
          (payload) => {
            console.log("Profile updated in real-time:", payload.new);
            setUserProfile(payload.new as UserProfile);
          }
        )
        .subscribe();
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
    <AuthContext.Provider value={{ user, userProfile, loading, signOut, refreshUser }}>
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
