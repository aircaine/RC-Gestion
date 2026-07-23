import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role;
      const path = nextUrl.pathname;

      const isLogin = path.startsWith("/login");
      const isInvite = path.startsWith("/invitation");
      const isManager = path.startsWith("/manager");
      const isEmployeeArea = path.startsWith("/heures");

      if (isInvite) {
        return true;
      }

      if (isLogin) {
        if (isLoggedIn) {
          return Response.redirect(
            new URL(role === "MANAGER" ? "/manager" : "/heures", nextUrl),
          );
        }
        return true;
      }

      if (isManager) {
        if (!isLoggedIn) return false;
        if (role !== "MANAGER") {
          return Response.redirect(new URL("/heures", nextUrl));
        }
        return true;
      }

      if (isEmployeeArea) {
        if (!isLoggedIn) return false;
        if (role === "MANAGER") {
          return Response.redirect(new URL("/manager", nextUrl));
        }
        return true;
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.name = user.name;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "MANAGER" | "EMPLOYEE";
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
} satisfies NextAuthConfig;
