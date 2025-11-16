import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAdmin = token?.role === "STAFF_ADMIN" || token?.role === "SUPER_ADMIN";
    const isSuperAdmin = token?.role === "SUPER_ADMIN";
    const path = req.nextUrl.pathname;

    // Admin routes
    if (path.startsWith("/admin")) {
      if (!isAdmin) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }

    // Super admin only routes (Content Management, Admin Settings)
    if (
      path.startsWith("/admin/content") ||
      path.startsWith("/admin/settings") ||
      path.startsWith("/admin/users")
    ) {
      if (!isSuperAdmin) {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
    }

    // Redirect based on role after login
    if (path === "/login" && token) {
      // If already logged in, redirect based on role
      if (isAdmin) {
        return NextResponse.redirect(new URL("/admin", req.url));
      } else {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        
        // Public routes that don't require auth
        const publicRoutes = [
          "/",
          "/visas",
          "/tours",
          "/blog",
          "/help",
          "/login",
          "/signup",
          "/api/auth",
        ];

        // Check if route is public
        if (publicRoutes.some(route => path === route || path.startsWith(route + "/"))) {
          return true;
        }

        // Dashboard and admin routes require auth
        if (path.startsWith("/dashboard") || path.startsWith("/admin")) {
          return !!token;
        }

        // Apply and book routes can be accessed by guests (will require login at payment)
        if (path.startsWith("/apply") || path.startsWith("/book")) {
          return true;
        }

        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/apply/:path*",
    "/book/:path*",
  ],
};

