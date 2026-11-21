import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/RegisterPage.tsx", "utf8");
const start = source.indexOf("async function closeWork(");
const end = source.indexOf("\nasync function ", start + 1);
const closeWork = source.slice(start, end === -1 ? undefined : end);

assert.ok(start >= 0, "closeWork handler must exist");
assert.match(closeWork, /\.update\(\{status:"Completato",progress_percent:100/);
assert.ok(closeWork.includes('let historyError:string|null=null'));
assert.ok(closeWork.includes('try{await logWorkEvent(w,"Chiusura"'));
assert.ok(closeWork.includes('await load();if(historyError)setError("Intervento chiuso correttamente, ma la registrazione dello storico è fallita:'));
assert.ok(closeWork.includes('catch(e:any){historyError=e?.message||"errore non specificato";}await load();if(historyError)setError'), "secondary history failure must not undo successful closure");
console.log("closeWork partial-success regression checks passed");
