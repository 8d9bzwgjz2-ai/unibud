import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("production runtime has no PGlite server dependency", async () => {
  const pkg = JSON.parse(await readFile("package.json", "utf8"));
  const lock = await readFile("package-lock.json", "utf8");
  const auth = await readFile("src/lib/auth/server.ts", "utf8");
  const db = await readFile("src/lib/db.ts", "utf8");
  assert.equal(pkg.dependencies?.["@electric-sql/pglite"], undefined);
  assert.equal(pkg.devDependencies?.["@electric-sql/pglite"], undefined);
  assert.doesNotMatch(lock, /node_modules\/@electric-sql\/pglite/);
  assert.doesNotMatch(auth, /@electric-sql\/pglite|pgliteDialect|getPglite/);
  assert.doesNotMatch(db, /@electric-sql\/pglite|PGlite/);
});
