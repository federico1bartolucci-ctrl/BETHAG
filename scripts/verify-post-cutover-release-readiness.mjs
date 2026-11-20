import { readFile } from "node:fs/promises";
import { certifyPostCutover } from "./lib/post-cutover-readiness.mjs";
const [qaPath, productionPath, backupPath] = process.argv.slice(2);
if (!qaPath || !productionPath || !backupPath) {
 console.error("Usage: node scripts/verify-post-cutover-release-readiness.m <qa-evidence.json> <production-readonly-snapshot.json> <backup-restore-disposition.json>");
 process.exitCode=2;
} else {
 try {
  const [qa,production,backupRestore]=await Promise.all([qaPath,productionPath,backupPath].map(async p=>JSON.parse(await readFile(p,"utf8"))));
  const report=certifyPostCutover({qa,production,backupRestore});
  console.log(JSON.stringify(report,null,2));
  if(report.status!=="GO") process.exitCode=1;
 } catch(e) { console.error("Certification failed to read/validate evidence:",e.message);process.exitCode=1; }
}
