import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // 获取 Better Auth 的 Session Cookie
  // 注意：Cookie 名称通常是 "better-auth.session_token"
  const sessionCookie = request.cookies.get("better-auth.session_token");

  const { pathname } = request.nextUrl;

  // 定义受保护的路由前缀
  const protectedPaths = ["/user", "/admin"];

  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

  if (isProtected && !sessionCookie) {
    // 如果未登录且访问受保护路由，重定向到首页
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/user/:path*", "/admin/:path*"],
};