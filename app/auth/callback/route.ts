import { NextResponse } from "next/server";
// The client you created from the Server-Side Auth instructions
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // if "next" is in search params, use it as the redirection URL
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    
    // 1. Exchange the code for a session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!exchangeError) {
      // 2. Force a session check to ensure cookies are written and available
      // This helps prevent race conditions where middleware doesn't see the session yet
      await supabase.auth.getUser();

      const forwardedHost = request.headers.get("x-forwarded-host"); // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === "development";
      
      // Construct final redirect URL
      let redirectUrl = `${origin}${next}`;
      
      if (!isLocalEnv && forwardedHost) {
        // Vercel production
        redirectUrl = `https://${forwardedHost}${next}`;
      }

      return NextResponse.redirect(redirectUrl);
    } else {
      console.error("Auth callback exchange error:", exchangeError);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
