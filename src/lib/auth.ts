import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { verifyMsg91OTP, verifyMsg91AccessToken } from "./sms";

export const authOptions: NextAuthOptions = {
  providers: [
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
    CredentialsProvider({
      id: "mobile-otp",
      name: "Mobile OTP",
      credentials: {
        phone: { label: "Phone", type: "text" },
        token: { label: "Token", type: "text" },
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials) {
        try {
          // If token is exactly 4 digits, it's an OTP code (fallback)
          // If it's longer, it's likely the access token from the widget
          if (!credentials?.phone || !credentials?.token) {
            console.log("[Auth] Missing phone or token");
            return null;
          }

          let verification;
          let mobile = credentials.phone;

          if (credentials.token.length === 4) {
            console.log("[Auth] Verifying direct OTP code:", credentials.token);
            verification = await verifyMsg91OTP(credentials.phone, credentials.token);
          } else {
            console.log("[Auth] Verifying MSG91 Access Token (length:", credentials.token.length, ")");
            verification = await verifyMsg91AccessToken(credentials.token);
            if (verification.success && verification.mobile) {
              console.log("[Auth] Access token verified for phone:", verification.mobile);
              mobile = verification.mobile;
            }
          }

          if (!verification.success) {
            console.log("[Auth] Mobile verification failed:", verification.message);
            throw new Error(verification.message || "INVALID_OTP");
          }

          // Verification is valid, now find or create the user
          let user = await prisma.user.findUnique({
            where: { phone: mobile },
          });

          if (!user) {
            // Create a new user if not found
            // If they provided a name, use it
            user = await prisma.user.create({
              data: {
                phone: credentials.phone,
                name: credentials.name || "User",
                phoneVerified: true,
                isActive: true,
                role: "CUSTOMER",
              },
            });
            console.log("[Auth] Created new user via mobile OTP:", credentials.phone);
          } else {
            // Update phoneVerified if not already
            if (!user.phoneVerified) {
              await prisma.user.update({
                where: { id: user.id },
                data: { phoneVerified: true },
              });
            }
            console.log("[Auth] Login successful via mobile OTP:", credentials.phone);
          }

          if (!user.isActive) {
            console.log("[Auth] User is inactive:", credentials.phone);
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          } as any;
        } catch (error: any) {
          console.error("[Auth] Mobile OTP unexpected error:", error);
          if (error?.message) throw error;
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

