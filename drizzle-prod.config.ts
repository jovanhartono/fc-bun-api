import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle/prod",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_PROD,
  },
});
