import { createHash } from "node:crypto";

export async function readAndVerifyBlobBody(body, expectedSha256, expectedSize, key) {
  if (!body || typeof body.transformToByteArray !== "function") {
    throw new Error("R2 blob read-back returned no readable body for " + JSON.stringify(key));
  }
  if (!/^[a-f0-9]{64}$/.test(expectedSha256)) {
    throw new TypeError("Expected a valid SHA-256 digest for " + JSON.stringify(key));
  }
  if (!Number.isSafeInteger(expectedSize) || expectedSize < 0) {
    throw new TypeError("Expected a valid byte length for " + JSON.stringify(key));
  }

  const value = await body.transformToByteArray();
  if (!(value instanceof Uint8Array)) {
    throw new Error("R2 blob read-back returned an invalid byte sequence for " + JSON.stringify(key));
  }

  const bytes = Buffer.from(value);
  if (bytes.length !== expectedSize) {
    throw new Error(
      "R2 blob read-back size mismatch for " + JSON.stringify(key) +
      ": expected " + expectedSize + ", received " + bytes.length
    );
  }

  const actualSha256 = createHash("sha256").update(bytes).digest("hex");
  if (actualSha256 !== expectedSha256) {
    throw new Error("R2 blob read-back SHA-256 mismatch for " + JSON.stringify(key));
  }

  return bytes;
}
