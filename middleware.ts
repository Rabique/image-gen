import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do not remove this. It's needed for Auth to work.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return supabaseResponse;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Webhook 경로는 인증 로직을 완전히 건너뜁니다.
  if (pathname.startsWith("/api/webhook")) {
    return NextResponse.next();
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 아래 경로들을 제외한 모든 경로에서 미들웨어 실행:
     * - _next/static, _next/image, favicon.ico
     * - api/webhook (웹훅 경로 명시적 제외)
     * - 정적 파일들
     */
    "/((?!_next/static|_next/image|favicon.ico|api/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
