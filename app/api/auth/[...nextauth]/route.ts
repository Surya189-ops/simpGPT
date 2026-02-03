// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const authOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),


    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        // ❗ IMPORTANT FIX: use `password`, not `hashedPassword`
        if (!user || !user.password) {
          throw new Error("Invalid credentials");
        }

        // Compare password
        const isCorrectPassword = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isCorrectPassword) {
          throw new Error("Invalid credentials");
        }

        // Return safe user object
        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token }: any) {
      if (!token?.email) return token;

      const dbUser = await prisma.user.findUnique({
        where: { email: token.email },
        select: {
          id: true,
          email: true,
          subscriptionTier: true,
          subscriptionStatus: true,
          stripeCustomerId: true,
          searchCount: true, // ✅ ADD THIS
        },
      });

      if (dbUser) {
        token.id = dbUser.id;
        token.email = dbUser.email;
        token.subscriptionTier = dbUser.subscriptionTier;
        token.subscriptionStatus = dbUser.subscriptionStatus;
        token.stripeCustomerId = dbUser.stripeCustomerId;
        token.searchCount = dbUser.searchCount; // ✅ ADD THIS
      }

      return token;
    },


    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.subscriptionTier = token.subscriptionTier;
        session.user.subscriptionStatus = token.subscriptionStatus;
        session.user.stripeCustomerId = token.stripeCustomerId;
        session.user.searchCount = token.searchCount; // ✅ ADD THIS
      }
      return session;
    },

  },

  pages: {
    signIn: "/tools/simpjobs",
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
