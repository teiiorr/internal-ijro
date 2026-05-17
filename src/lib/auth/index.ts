import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users, type Position, type UserStatus } from "@/lib/db/schema";
import { verifyPassword } from "./password";
import { verifyTotp } from "./twofa";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      fullName: string;
      position: Position;
      departmentId: string | null;
      status: UserStatus;
      languagePreference: string;
      themePreference: string;
      twoFactorEnabled: boolean;
    } & DefaultSession["user"];
  }
  interface User {
    id?: string;
    email?: string | null;
    fullName?: string;
    position?: Position;
    departmentId?: string | null;
    status?: UserStatus;
    languagePreference?: string;
    themePreference?: string;
    twoFactorEnabled?: boolean;
  }
}

const credsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totp: z.string().optional(),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totp: { label: "2FA code", type: "text" },
      },
      authorize: async (raw) => {
        const parsed = credsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password, totp } = parsed.data;

        const row = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .limit(1);
        const user = row[0];
        if (!user) return null;

        if (user.lockedUntil && user.lockedUntil > new Date()) return null;
        if (user.status === "archived" || user.status === "blocked") return null;

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) {
          const failed = user.failedLoginCount + 1;
          const locked = failed >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
          await db
            .update(users)
            .set({ failedLoginCount: failed, lockedUntil: locked })
            .where(eq(users.id, user.id));
          return null;
        }

        if (user.twoFactorEnabled) {
          if (!totp || !user.twoFactorSecret || !verifyTotp(totp, user.twoFactorSecret)) {
            return null;
          }
        }

        await db
          .update(users)
          .set({ failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() })
          .where(eq(users.id, user.id));

        return {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          position: user.position,
          departmentId: user.departmentId,
          status: user.status,
          languagePreference: user.languagePreference,
          themePreference: user.themePreference,
          twoFactorEnabled: user.twoFactorEnabled,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.uid = user.id;
        token.fullName = user.fullName;
        token.position = user.position;
        token.departmentId = user.departmentId ?? null;
        token.status = user.status;
        token.languagePreference = user.languagePreference;
        token.themePreference = user.themePreference;
        token.twoFactorEnabled = user.twoFactorEnabled;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (token.uid) {
        session.user.id = token.uid as string;
        session.user.fullName = (token.fullName as string) ?? "";
        session.user.position = token.position as Position;
        session.user.departmentId = (token.departmentId as string | null) ?? null;
        session.user.status = token.status as UserStatus;
        session.user.languagePreference = (token.languagePreference as string) ?? "uz-latn";
        session.user.themePreference = (token.themePreference as string) ?? "system";
        session.user.twoFactorEnabled = Boolean(token.twoFactorEnabled);
      }
      return session;
    },
  },
});
