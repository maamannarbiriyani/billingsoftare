import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/auth";

const protectedRoutes = [
  "/dashboard",
  "/products",
  "/billing",
  "/reports",
  "/settings",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  );

  if (isProtectedRoute) {
    const sessionCookie = request.cookies.get("session")?.value;
    const session = await decrypt(sessionCookie);

    if (!session) {
      // Not logged in or invalid session
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Allow access to root landing page
  if (pathname === "/") {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
