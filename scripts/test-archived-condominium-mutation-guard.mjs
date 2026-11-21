#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const migrationSql = await readFile("supabase/migrations/20261121153000_block_mutations_moving_records_from_archived_condominiums.sql", "utf8");
await db.exec(`
  CREATE TABLE condominiums (id uuid PRIMARY KEY, archived_at timestamptz);
  CREATE TABLE records (id integer PRIMARY KEY, condominium_id uuid NOT NULL, value text);
  INSERT INTO condominiums VALUES
    ('00000000-0000-0000-0000-000000000001', NULL),
    ('00000000-0000-0000-0000-000000000002', now());
  INSERT INTO records VALUES (3, '00000000-0000-0000-0000-000000000002', 'archived seed');
`);
await db.exec(migrationSql);
await db.exec(`
  CREATE TRIGGER records_archive_guard BEFORE INSERT OR UPDATE OR DELETE ON records
  FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();
`);

const active = "00000000-0000-0000-0000-000000000001";
const archived = "00000000-0000-0000-0000-000000000002";
await db.query("INSERT INTO records VALUES (1, $1, 'active')", [active]);
await assert.rejects(db.query("INSERT INTO records VALUES (2, $1, 'archived')", [archived]), /archived condominium destination blocked/);
await assert.rejects(db.query("UPDATE records SET condominium_id=$1 WHERE id=3", [active]), /archived condominium source update blocked/);
await assert.rejects(db.query("DELETE FROM records WHERE id=3"), /archived condominium delete blocked/);
await db.query("INSERT INTO records VALUES (4, $1, 'active deletion')", [active]);
await db.query("DELETE FROM records WHERE id=4");
await db.query("INSERT INTO records VALUES (5, $1, 'active update')", [active]);
await db.query("UPDATE records SET value='updated' WHERE id=5");
console.log(JSON.stringify({status:"PASS",test:"archived condominium mutation guard",cases:["archived insert blocked","move into archived blocked","move out of archived blocked","archived delete blocked","active delete allowed","active update allowed"]},null,2));
await db.close();
