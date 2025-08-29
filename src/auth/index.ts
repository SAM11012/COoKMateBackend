// src/auth/index.ts - CORRECTED

import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Google from "@auth/core/providers/google";
import Credentials from "@auth/core/providers/credentials";
import { db } from "../db";
import * as schema from "../db/schema";
import bcrypt from 'bcryptjs';

// No explicit type needed here. TypeScript will infer it.
// This is the most common and straightforward approach.
export const authConfig = {
    adapter: DrizzleAdapter(db, {
        usersTable: schema.users,
        accountsTable: schema.accounts,
        sessionsTable: schema.sessions,
        verificationTokensTable: schema.verificationTokens
    }),
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        Credentials({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                // ... (your authorize function is perfect, no changes needed here)
                if (!credentials?.email || !credentials.password) {
                    return null;
                }
                const user = await db.query.users.findFirst({
                    where: (users, { eq }) => eq(users.email, credentials.email as string),
                });
                if (!user || !user.hashedPassword) {
                    return null;
                }
                const isPasswordValid = await bcrypt.compare(
                    credentials.password as string,
                    user.hashedPassword
                );
                if (isPasswordValid) {
                    return { id: user.id, name: user.name, email: user.email, image: user.image };
                }
                return null;
            },
        }),
    ],
    session: {
        strategy: "jwt" as const, // Using 'as const' can provide slightly better type inference
    },
    secret: process.env.AUTH_SECRET,
};