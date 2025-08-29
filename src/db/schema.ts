import {
  timestamp,
  pgTable,
  text,
  primaryKey,
  integer,
  serial,
  varchar,
  boolean,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "@auth/core/adapters";

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  hashedPassword: text("hashedPassword"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

export const userPreferences = pgTable("userPreferences", {
  id: serial("id").primaryKey(),

  // This is the crucial link back to the user table
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }) // If a user is deleted, their preferences are also deleted.
    .unique(), // .unique() enforces the One-to-One relationship

  // --- Your defined fields translated to Drizzle ---
  name: text("name").notNull(),
  age: integer("age"),
  gender: text("gender"),
  dietaryPreference: text("dietaryPreference"),
  spicinessLevel: text("spicinessLevel"),

  // For String[], we use .array()
  cuisinePreferences: text("cuisinePreferences").array(),
  ingredientDislikes: text("ingredientDislikes").array(),

  cookName: text("cookName"),
  cookWhatsApp: text("cookWhatsApp"),
  preferredLanguage: text("preferredLanguage"),
  userWhatsApp: text("userWhatsApp"),

  mealsPerDay: integer("mealsPerDay"),
  breakfast: boolean("breakfast").default(false),
  lunch: boolean("lunch").default(false),
  dinner: boolean("dinner").default(false),
  onboarded: boolean("onboarded").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
