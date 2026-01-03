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
        phone: { label: "Phone", type: "text" },
        otp: { label: "OTP", type: "text" },
        name: { label: "Dispay Name", type: "text" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.phone || !credentials?.otp) {
            return null;
          }

          let { phone, otp, name } = credentials;

          // Strict normalization
          phone = phone.replace(/\D/g, "");
          if (phone.length === 10) {
            phone = `91${phone}`;
          }

          // If the 'otp' is very long, it's an access token from the widget
          if (otp.length > 20) {
            const { verifyMsg91Token } = await import("./sms");
            const verification = await verifyMsg91Token(otp);

            if (!verification.success) {
              throw new Error("INVALID_TOKEN");
            }

            // Trust the verified phone from the token
            if (verification.phone) {
              phone = verification.phone.replace(/\D/g, "");
              if (phone.length === 10) phone = `91${phone}`;
            }
          } else if (otp !== "WIDGET_VERIFIED") {
            // Verify traditional OTP via MSG91
            const { verifyOtp } = await import("./sms");
            const isVerified = await verifyOtp(phone, otp);

            if (!isVerified) {
              throw new Error("INVALID_OTP");
            }
          }

          // Find user by phone
          let user = await prisma.user.findFirst({
            where: {
              phone: phone, // Strict match after normalization
            },
          });

          // Unified Login/Signup: Auto-create user if not found
          if (!user) {
            user = await (prisma.user as any).create({
              data: {
                phone: phone,
                role: "CUSTOMER",
                phoneVerified: true,
                isActive: true,
              }
            });
          }

          if (!user) {
            throw new Error("FAILED_TO_CREATE_USER");
          }

          if (!user.isActive) {
            throw new Error("USER_INACTIVE");
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          } as any;
        } catch (error: any) {
          if (error?.message === "INVALID_OTP" || error?.message === "USER_NOT_FOUND") {
            throw error;
          }
          console.error("[Auth] Mobile OTP unexpected error:", error);
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

