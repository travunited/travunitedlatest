import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "mobile-otp",
      name: "Mobile OTP",
      credentials: {
        accessToken: { label: "Access Token", type: "text" },
        name: { label: "Display Name", type: "text" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.accessToken) {
            console.error("[Auth] Missing accessToken");
            return null;
          }

          const { accessToken, name } = credentials;

          // Step 1: Verify token with MSG91 (SERVER-SIDE ONLY)
          const { verifyMsg91Token } = await import("./sms");
          const verification = await verifyMsg91Token(accessToken);

          console.log("[Auth] MSG91 Verify Result:", verification);

          if (!verification.success || !verification.phone) {
            console.error("[Auth] Token verification failed:", verification.message);
            throw new Error("INVALID_TOKEN");
          }

          let phone = verification.phone.replace(/\D/g, "");
          console.log("[Auth] Proceeding with phone:", phone);

          // Find user by phone
          let user = await prisma.user.findFirst({
            where: {
              phone: phone,
            },
          });

          // Unified Login/Signup: Auto-create user if not found
          if (!user) {
            console.log("[Auth] User not found, creating new user for:", phone);
            user = await (prisma.user as any).create({
              data: {
                phone: phone,
                name: name || null,
                role: "CUSTOMER",
                phoneVerified: true,
                isActive: true,
                email: null,
                passwordHash: null,
              }
            });
          }

          if (!user) {
            throw new Error("FAILED_TO_CREATE_USER");
          }

          if (!user.isActive) {
            throw new Error("USER_INACTIVE");
          }

          console.log("[Auth] Auth successful for user ID:", user.id);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          } as any;
        } catch (error: any) {
          console.error("[Auth] Mobile OTP error:", error.message || error);
          if (error?.message === "INVALID_TOKEN" || error?.message === "INVALID_OTP" || error?.message === "USER_INACTIVE" || error?.message === "FAILED_TO_CREATE_USER") {
            throw error;
          }
          return null;
        }
      },
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.log("[Auth] Missing email or password");
            return null;
          }

          let user;
          try {
            user = await prisma.user.findUnique({
              where: { email: credentials.email },
            });
          } catch (dbError) {
            console.error("[Auth] Database error:", dbError);
            throw new Error("DATABASE_ERROR");
          }

          if (!user) {
            console.log("[Auth] User not found:", credentials.email);
            return null;
          }

          if (!user.isActive) {
            console.log("[Auth] User is inactive:", credentials.email);
            return null;
          }

          // Check if email is verified (required for login)
          if (!user.emailVerified) {
            console.log("[Auth] Email not verified:", credentials.email);
            throw new Error("EMAIL_NOT_VERIFIED");
          }

          const isValid = await bcrypt.compare(
            credentials.password,
            user.passwordHash
          );

          if (!isValid) {
            console.log("[Auth] Invalid password for:", credentials.email);
            return null;
          }

          console.log("[Auth] Login successful:", credentials.email);
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          } as any;
        } catch (error: any) {
          // Re-throw specific errors so they can be caught by NextAuth
          if (error?.message === "EMAIL_NOT_VERIFIED" || error?.message === "DATABASE_ERROR") {
            throw error;
          }
          // Log other errors but don't expose them
          console.error("[Auth] Unexpected error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    signOut: "/",
    error: "/login", // Redirect errors to login page
  },
  debug: process.env.NODE_ENV === "development",
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

