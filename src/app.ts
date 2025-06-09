import { Hono } from "hono";
import { JwtVariables } from "hono/jwt";

const app = new Hono<{ Variables: JwtVariables }>();

export default app;
