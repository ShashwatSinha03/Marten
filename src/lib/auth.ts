import NextAuth, { type NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import { getServerSession as getServerSessionInner } from "next-auth";

import { getMongoClient } from "@/lib/mongoose/connection";
import config from "@/lib/config";

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(getMongoClient()),
  providers: [
    GitHubProvider({
      clientId: config.auth.github.clientId,
      clientSecret: config.auth.github.clientSecret,
    }),
    GoogleProvider({
      clientId: config.auth.google.clientId,
      clientSecret: config.auth.google.clientSecret,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};

export const handler = NextAuth(authOptions);

/**
 * Retrieves the current server-side session.
 * Wraps NextAuth's getServerSession with the shared authOptions.
 */
export async function getServerSession() {
  return getServerSessionInner(authOptions);
}

export { type Session } from "next-auth";
