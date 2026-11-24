import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { updateDocumentAiStateForWorkspace } from "../src/lib/documentAiWorkspaceGuard.mjs";

const workspaceADocument = {
  id: 42,
  condominiumId: 7,
  storagePath: "workspace-a/condominium-7/document-42/original.pdf",
  aiStatus: "In elaborazione",
  aiSummary: "",
  extractedData: "",
};

const workspaceBDocument = {
  id: 42,
  condominiumId: 7,
  storagePath: "workspace-b/condominium-7/document-42/original.pdf",
  aiStatus: "Confermato",
  aiSummary: "Dati preesistenti del workspace B",
  extractedData: "workspace-b-data",
};

const aiResultFromA = {
  aiStatus: "Da verificare",
  aiSummary: "Contenuto estratto dal workspace A",
  extractedData: "workspace-a-data",
};

// Reproduce the previous ID-only updater: a late A result overwrites B's
// same-numbered document, and a late A failure resets B's confirmed status.
const legacyIdOnlySuccess = [workspaceBDocument].map((document) =>
  document.id === workspaceADocument.id
    ? { ...document, ...aiResultFromA }
    : document
);
assert.equal(legacyIdOnlySuccess[0].aiSummary, "Contenuto estratto dal workspace A");
assert.equal(legacyIdOnlySuccess[0].extractedData, "workspace-a-data");

const legacyIdOnlyFailure = [workspaceBDocument].map((document) =>
  document.id === workspaceADocument.id
    ? { ...document, aiStatus: "Non elaborato" }
    : document
);
assert.equal(legacyIdOnlyFailure[0].aiStatus, "Non elaborato");

const workspaceBDocuments = [workspaceBDocument];
const staleSuccess = updateDocumentAiStateForWorkspace(
  workspaceBDocuments,
  {
    currentWorkspaceId: "workspace-b",
    documentsWorkspaceId: "workspace-b",
    requestWorkspaceId: "workspace-a",
    requestDocument: workspaceADocument,
  },
  aiResultFromA,
);
assert.strictEqual(staleSuccess, workspaceBDocuments);
assert.strictEqual(staleSuccess[0], workspaceBDocument);
assert.equal(staleSuccess[0].aiSummary, "Dati preesistenti del workspace B");
assert.equal(staleSuccess[0].extractedData, "workspace-b-data");

const staleFailure = updateDocumentAiStateForWorkspace(
  workspaceBDocuments,
  {
    currentWorkspaceId: "workspace-b",
    documentsWorkspaceId: "workspace-b",
    requestWorkspaceId: "workspace-a",
    requestDocument: workspaceADocument,
  },
  { aiStatus: "Non elaborato" },
);
assert.strictEqual(staleFailure, workspaceBDocuments);
assert.strictEqual(staleFailure[0], workspaceBDocument);
assert.equal(staleFailure[0].aiStatus, "Confermato");

const currentDocuments = [workspaceADocument];
const currentResult = updateDocumentAiStateForWorkspace(
  currentDocuments,
  {
    currentWorkspaceId: "workspace-a",
    documentsWorkspaceId: "workspace-a",
    requestWorkspaceId: "workspace-a",
    requestDocument: workspaceADocument,
  },
  aiResultFromA,
);
assert.notStrictEqual(currentResult, currentDocuments);
assert.equal(currentResult[0].aiStatus, "Da verificare");
assert.equal(currentResult[0].aiSummary, "Contenuto estratto dal workspace A");
assert.equal(currentResult[0].extractedData, "workspace-a-data");

const replacedDocument = {
  ...workspaceADocument,
  storagePath: "workspace-a/condominium-7/document-42/replacement.pdf",
};
const replacedFileResult = updateDocumentAiStateForWorkspace(
  [replacedDocument],
  {
    currentWorkspaceId: "workspace-a",
    documentsWorkspaceId: "workspace-a",
    requestWorkspaceId: "workspace-a",
    requestDocument: workspaceADocument,
  },
  aiResultFromA,
);
assert.strictEqual(replacedFileResult[0], replacedDocument);

const movedDocument = {
  ...workspaceADocument,
  condominiumId: 8,
};
const movedCondominiumResult = updateDocumentAiStateForWorkspace(
  [movedDocument],
  {
    currentWorkspaceId: "workspace-a",
    documentsWorkspaceId: "workspace-a",
    requestWorkspaceId: "workspace-a",
    requestDocument: workspaceADocument,
  },
  aiResultFromA,
);
assert.strictEqual(movedCondominiumResult[0], movedDocument);

const missingWorkspace = updateDocumentAiStateForWorkspace(
  [workspaceADocument],
  {
    currentWorkspaceId: null,
    documentsWorkspaceId: null,
    requestWorkspaceId: "workspace-a",
    requestDocument: workspaceADocument,
  },
  aiResultFromA,
);
assert.strictEqual(missingWorkspace[0], workspaceADocument);

const staleCollectionDocuments = [workspaceADocument];
const staleCollectionResult = updateDocumentAiStateForWorkspace(
  staleCollectionDocuments,
  {
    currentWorkspaceId: "workspace-b",
    documentsWorkspaceId: "workspace-a",
    requestWorkspaceId: "workspace-b",
    requestDocument: workspaceADocument,
  },
  aiResultFromA,
);
assert.strictEqual(staleCollectionResult, staleCollectionDocuments);

const mainSource = await readFile("src/main.tsx", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const processStart = mainSource.indexOf("const processDocumentAI = async");
const confirmStart = mainSource.indexOf("const confirmDocumentAI = async", processStart);
const assemblyStart = mainSource.indexOf("/* =======================================================\n     ASSEMBLEE", confirmStart);
assert.ok(processStart >= 0 && confirmStart > processStart && assemblyStart > confirmStart, "active document AI handlers must exist");
const processSource = mainSource.slice(processStart, confirmStart);
const confirmSource = mainSource.slice(confirmStart, assemblyStart);
assert.match(mainSource, /import \{ updateDocumentAiStateForWorkspace \} from "\.\/lib\/documentAiWorkspaceGuard\.mjs";/);
assert.match(mainSource, /const activeDocumentWorkspaceIdRef = useRef\(profile\.workspaceId\);[\s\S]*?activeDocumentWorkspaceIdRef\.current = profile\.workspaceId;/);
assert.match(mainSource, /const documentsWorkspaceIdRef = useRef<string \| null>\(null\);/);
assert.equal((mainSource.match(/documentsWorkspaceIdRef\.current = (?:workspaceId|profile\.workspaceId);/g) ?? []).length, 2);
assert.match(processSource, /documentsWorkspaceIdRef\.current !== requestWorkspaceId/);
assert.match(confirmSource, /documentsWorkspaceIdRef\.current !== requestWorkspaceId/);
assert.match(processSource, /getActiveWorkspaceId\(undefined, requestWorkspaceId\)/);
assert.match(processSource, /updateDocumentAiStateForWorkspace/);
assert.doesNotMatch(processSource, /doc\.id === item\.id/, "AI processing results must not update documents by legacy ID alone");
assert.match(confirmSource, /getActiveWorkspaceId\(undefined, requestWorkspaceId\)/);
assert.match(confirmSource, /updateDocumentAiStateForWorkspace/);
assert.doesNotMatch(confirmSource, /doc\.id === id/, "AI confirmation results must not update documents by legacy ID alone");
const testCommand = packageJson.scripts?.test ?? "";
assert.equal(
  testCommand.split("test-document-ai-workspace-stale-result.mjs").length - 1,
  1,
  "document AI workspace regression must be wired exactly once into npm test",
);

console.log("Document AI workspace stale-result runtime regression: PASS");
