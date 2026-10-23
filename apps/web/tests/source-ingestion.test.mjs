import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";

// Import the ingestion utilities under test
import {
  validateSourcePath,
  validateGitUrl,
  isSafeZipEntryPath,
} from "../src/lib/source-ingestion.ts";

test("validateSourcePath allows existing project directories and rejects path traversal", () => {
  const repoRoot = fs.existsSync(path.resolve(process.cwd(), "sample-apps"))
    ? process.cwd()
    : fs.existsSync(path.resolve(process.cwd(), "..", "sample-apps"))
    ? path.resolve(process.cwd(), "..")
    : path.resolve(process.cwd(), "..", "..");
  const samplePath = "sample-apps/nodejs-demo";

  // Valid project path with explicit root
  const validRes = validateSourcePath(samplePath, repoRoot);
  assert.equal(validRes.valid, true);
  assert.ok(validRes.resolvedPath.endsWith("sample-apps/nodejs-demo"));

  // Default baseDir should locate sample-apps/nodejs-demo from apps/web without error
  const defaultBaseRes = validateSourcePath(samplePath);
  assert.equal(defaultBaseRes.valid, true, `Expected default validateSourcePath("${samplePath}") to be valid: ${defaultBaseRes.error}`);
  assert.ok(defaultBaseRes.resolvedPath.endsWith("sample-apps/nodejs-demo"));

  // Valid absolute directory path
  const absoluteValidDir = path.resolve(repoRoot, "sample-apps", "nodejs-demo");
  const absoluteRes = validateSourcePath(absoluteValidDir);
  assert.equal(absoluteRes.valid, true, `Expected absolute path "${absoluteValidDir}" to be valid: ${absoluteRes.error}`);
  assert.equal(absoluteRes.resolvedPath, absoluteValidDir);

  // Path traversal outside project root
  const traversalRes = validateSourcePath("../../../etc/passwd", repoRoot);
  assert.equal(traversalRes.valid, false);
  assert.match(traversalRes.error, /traversal|outside/i);

  // Absolute path outside workspace roots must be rejected
  const absoluteEscapeRes = validateSourcePath("/etc", repoRoot);
  assert.equal(absoluteEscapeRes.valid, false);
  assert.match(absoluteEscapeRes.error, /traversal|outside/i);

  // Non-existent directory
  const missingRes = validateSourcePath("sample-apps/non-existent-app-12345", repoRoot);
  assert.equal(missingRes.valid, false);
  assert.match(missingRes.error, /not exist/i);
});

test("validateGitUrl accepts safe public git URLs and rejects shell injection attempts", () => {
  // Safe URLs
  const valid1 = validateGitUrl("https://github.com/liara-cloud/nodejs-platform.git");
  assert.equal(valid1.valid, true);

  const valid2 = validateGitUrl("https://gitlab.com/example/sample-project");
  assert.equal(valid2.valid, true);

  // Malicious / injection URLs
  const invalid1 = validateGitUrl("https://github.com/foo/bar; rm -rf /");
  assert.equal(invalid1.valid, false);

  const invalid2 = validateGitUrl("ssh://git@github.com/secret/repo.git");
  assert.equal(invalid2.valid, false); // Milestone spec: public HTTP/HTTPS only
});

test("isSafeZipEntryPath prevents Zip Slip vulnerabilities", () => {
  assert.equal(isSafeZipEntryPath("server.js"), true);
  assert.equal(isSafeZipEntryPath("src/index.js"), true);
  assert.equal(isSafeZipEntryPath("node_modules/package/index.js"), true);

  // Unsafe Zip entries attempting to escape target directory
  assert.equal(isSafeZipEntryPath("../malicious.js"), false);
  assert.equal(isSafeZipEntryPath("../../etc/shadow"), false);
  assert.equal(isSafeZipEntryPath("/absolute/path.js"), false);
});
