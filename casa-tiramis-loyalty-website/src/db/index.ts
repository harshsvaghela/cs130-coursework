import { drizzle } from "drizzle-orm/netlify-db";
import * as schema from "../../db/schema";

let db: ReturnType<typeof createDatabase> | undefined;

function createDatabase() {
  return drizzle({ schema });
}

// Route modules are imported during builds. Connect only when a request needs it.
export function getDb() {
  return (db ??= createDatabase());
}
