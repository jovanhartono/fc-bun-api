import { db } from "./index";
import { usersTable } from "./schema";

const adminPassword = "rojpyp-2cuzdo-rozmoP";
const passwordHash = await Bun.password.hash(adminPassword);

await db.insert(usersTable).values({
  name: "admin",
  password: passwordHash,
  username: "admin",
  role: "admin",
});
