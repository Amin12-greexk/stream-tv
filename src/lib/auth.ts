import { prisma } from "./prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcrypt";
import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user) return null;
        const ok = await compare(credentials.password, user.password);
        if (!ok) return null;
        return { id: user.id, email: user.email, role: user.role };
      },
    }),
  ],
  pages: { signIn: "/login" },
};
