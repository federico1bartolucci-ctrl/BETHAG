import { createHash } from "node:crypto";

/** Match Git's blob object ID for text files across LF/CRLF checkouts. */
export function gitBlobSha(content) {
  const canonicalContent = content.replace(/\r\n/g, "\n");
  const bytes = Buffer.from(canonicalContent, "utf8");
  return createHash("sha1").update(Buffer.concat([
    Buffer.from(`blob ${bytes.length}\0`),
    bytes,
  ])).digest("hex");
}

/** Match the guarded runner's accepted libpq connection configuration. */
export function hasPostgresConnectionConfig(env) {
  return Boolean(env.DATABASE_URL || (env.PGHOST && env.PGDATABASE && env.PGUSER));
}
