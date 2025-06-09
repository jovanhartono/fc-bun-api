declare module "bun" {
  interface Env {
    JWT_SECRET: string;
    DATABASE_URL: string;
  }
}
