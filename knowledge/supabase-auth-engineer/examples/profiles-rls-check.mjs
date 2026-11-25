// Worked example: static self-check of profiles-rls.sql (skill: supabase-row-level-security).
// It reads text only. It does not run SQL. A real test on a dev project is still required.
// Run: node profiles-rls-check.mjs
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

export function checkSql(sqlText) {
  const problems = [];
  const sql = sqlText.replace(/--.*$/gm, "").replace(/\s+/g, " ").toLowerCase(); // drop comments
  const need = (cond, msg) => { if (!cond) problems.push(msg); };
  need(/alter table public\.profiles enable row level security/.test(sql), "RLS not enabled on public.profiles");
  need(/revoke all on public\.profiles from anon, authenticated/.test(sql), "missing revoke all from anon, authenticated");
  const grants = [...sql.matchAll(/grant ([a-z, ]+) on public\.profiles to ([a-z_, ]+);/g)];
  need(grants.length === 1 && grants[0][1].trim() === "select" && grants[0][2].trim() === "authenticated", "only 'grant select ... to authenticated' is allowed on profiles");
  const policies = [...sql.matchAll(/create policy [^;]*;/g)].map((m) => m[0]);
  need(policies.length === 1, `expected exactly 1 policy, found ${policies.length}`);
  for (const p of policies) {
    need(/ for select /.test(p), "policy must be for select");
    need(/ to authenticated /.test(p), "policy must name role authenticated");
    need(/\(select auth\.uid\(\)\) = id/.test(p), "policy must use (select auth.uid()) = id");
  }
  need(!/ for (insert|update|delete|all) /.test(sql), "no insert/update/delete/all policies allowed");
  need(/check \(role in \('user', 'super_admin'\)\)/.test(sql), "role check constraint missing");
  need(/role text not null default 'user'/.test(sql), "role must default to 'user'");
  const fns = [...sql.matchAll(/create function ([a-z_.]+)\(\)[^$]*\$\$/g)];
  need(fns.length >= 2, "expected the trigger and audit functions");
  for (const [whole, name] of fns) {
    need(name.startsWith("private."), `function ${name} must live in schema private`);
    need(/security definer/.test(whole) && /set search_path = ''/.test(whole), `function ${name} needs security definer + set search_path = ''`);
    need(new RegExp(`revoke all on function ${name.replace(".", "\\.")}\\(\\) from public, anon, authenticated`).test(sql), `execute not revoked on ${name}`);
  }
  need(/insert into public\.profiles \(id\) values \(new\.id\)/.test(sql), "sign-up trigger must insert only (id)");
  need(!/user_metadata|raw_user_meta_data|app_metadata/.test(sql), "SQL must not read user or app metadata");
  need(!/service_role|sb_secret_/.test(sql), "SQL must not mention secret or service_role keys");
  need(/alter table private\.role_changes enable row level security/.test(sql), "audit table needs RLS");
  need(/after insert or update of role on public\.profiles/.test(sql), "role audit trigger missing");
  return problems;
}

function selfTest() {
  const sql = readFileSync(new URL("./profiles-rls.sql", import.meta.url), "utf8");
  assert.deepEqual(checkSql(sql), []);
  // mutants must fail
  assert.ok(checkSql(sql.replace("enable row level security;", "disable row level security;")).length > 0);
  assert.ok(checkSql(sql.replace("grant select on public.profiles", "grant select, update on public.profiles")).length > 0);
  assert.ok(checkSql(sql.replace("set search_path = ''", "")).length > 0);
  assert.ok(checkSql(sql.replace("create function private.handle_new_user", "create function public.handle_new_user")).length > 0);
  assert.ok(checkSql(sql + "\ncreate policy p on public.profiles for update to authenticated using (true);").length > 0);
  assert.ok(checkSql(sql.replace("values (new.id);", "values (new.id, new.raw_user_meta_data);")).length > 0);
  console.log("OK: profiles-rls.sql passes static RLS checks; 6 broken variants are caught");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) selfTest();
