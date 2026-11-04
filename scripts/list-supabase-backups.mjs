import process from "node:process";

const projectRef = process.env.BETHAG_PRODUCTION_PROJECT_REF ?? "tctcgptrsmvgajqjgnev";
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (!accessToken) {
  console.error("Missing SUPABASE_ACCESS_TOKEN. Create a token in Supabase Dashboard > Account > Access Tokens and set it in your shell; do not commit it.");
  process.exit(2);
}
if (!/^[a-z0-9]{20}$/.test(projectRef)) {
  console.error("Invalid project ref.");
  process.exit(2);
}

const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/database/backups`;
const response = await fetch(endpoint, {
  method: "GET",
  headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
});
const body = await response.text();

if (!response.ok) {
  console.error(`Supabase backup inventory request failed (HTTP ${response.status}).`);
  // Do not print request headers, access token, or full response bodies that may contain account metadata.
  console.error(body.slice(0, 1200));
  process.exit(1);
}

let payload;
try {
  payload = JSON.parse(body);
} catch {
  console.error("Supabase returned a non-JSON backup inventory response.");
  process.exit(1);
}

const backups = Array.isArray(payload) ? payload : (payload.backups ?? payload.data ?? null);
if (!Array.isArray(backups)) {
  console.log(JSON.stringify({ project_ref: projectRef, response_shape: Object.keys(payload ?? {}), raw: payload }, null, 2));
  process.exit(0);
}

console.log(JSON.stringify({
  project_ref: projectRef,
  backup_count: backups.length,
  backups: backups.map((item) => ({
    id: item.id ?? item.backup_id ?? null,
    status: item.status ?? item.state ?? null,
    type: item.type ?? item.backup_type ?? null,
    created_at: item.inserted_at ?? item.created_at ?? item.createdAt ?? null,
    recovery_time: item.recovery_time ?? item.recoveryTime ?? null,
    size_bytes: item.size_bytes ?? item.size ?? null,
  })),
}, null, 2));
