import type { AppType } from "@fresclean/api";
import { hc } from "hono/client";

export const rpc = hc<AppType>("http://localhost:8000/", {
  headers: {
    Authorization: `Bearer ${localStorage.getItem("jwt")}`
  }
});
