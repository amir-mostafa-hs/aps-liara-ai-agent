import path from "node:path";
import fs from "node:fs";

export interface SourceValidationResult {
  valid: boolean;
  resolvedPath?: string;
  error?: string;
}

/**
 * Validates a local filesystem path, ensuring it exists, is a directory,
 * and does not escape above the permitted project or system jail.
 */
export function validateSourcePath(
  inputPath: string,
  baseDir: string = process.cwd(),
  allowedRoots?: string[]
): SourceValidationResult {
  if (!inputPath || typeof inputPath !== "string") {
    return { valid: false, error: "Project path cannot be empty." };
  }

  try {
    const defaultRoots = [
      path.resolve(baseDir),
      path.resolve(baseDir, ".."),
      process.cwd(),
      path.resolve(process.cwd(), ".."),
    ];
    const permittedRoots = (allowedRoots || defaultRoots).map((r) =>
      path.resolve(r)
    );

    // If the path contains relative traversal tokens that try to escape
    if (
      inputPath.includes("..") &&
      (inputPath.startsWith("..") ||
        inputPath.includes("/..") ||
        inputPath.includes("\\.."))
    ) {
      return {
        valid: false,
        error:
          "Path traversal detected: directory is outside the allowed workspace.",
      };
    }

    let resolvedPath = path.isAbsolute(inputPath)
      ? path.resolve(inputPath)
      : path.resolve(baseDir, inputPath);

    if (!fs.existsSync(resolvedPath) && !path.isAbsolute(inputPath)) {
      const parentResolved = path.resolve(baseDir, "..", inputPath);
      if (fs.existsSync(parentResolved)) {
        resolvedPath = parentResolved;
      }
    }

    // Verify confinement: resolvedPath MUST start with at least one permitted root
    const isConfined = permittedRoots.some(
      (root) =>
        resolvedPath === root || resolvedPath.startsWith(root + path.sep)
    );
    if (!isConfined) {
      return {
        valid: false,
        error:
          "Path traversal detected: directory is outside the allowed workspace.",
      };
    }

    if (!fs.existsSync(resolvedPath)) {
      return {
        valid: false,
        error: `Source directory does not exist: ${inputPath}`,
      };
    }

    const stat = fs.statSync(resolvedPath);
    if (!stat.isDirectory()) {
      return {
        valid: false,
        error: `Specified path is not a directory: ${inputPath}`,
      };
    }

    return { valid: true, resolvedPath };
  } catch (err: any) {
    return { valid: false, error: err.message || "Failed to validate path" };
  }
}

/**
 * Validates a Git clone URL. Per the spec, public HTTP/HTTPS repositories
 * are supported for this milestone; shell injection tokens are strictly blocked.
 */
export function validateGitUrl(url: string): { valid: boolean; error?: string } {
  if (!url || typeof url !== "string") {
    return { valid: false, error: "Git URL cannot be empty." };
  }

  const cleanUrl = url.trim();

  // Strict check: must start with https:// or http://
  if (!cleanUrl.startsWith("https://") && !cleanUrl.startsWith("http://")) {
    return {
      valid: false,
      error: "Only public HTTP/HTTPS git repositories are supported.",
    };
  }

  // Block command injection characters: ; & | ` $ < > ( ) \n \r
  const dangerousCharRegex = /[;&|`$<>()\r\n ]/;
  if (dangerousCharRegex.test(cleanUrl)) {
    return {
      valid: false,
      error: "Invalid Git repository URL: contains forbidden characters.",
    };
  }

  return { valid: true };
}

/**
 * Validates that an archive entry relative path does not break out of its target directory.
 * Prevents Zip Slip vulnerability (CWE-22).
 */
export function isSafeZipEntryPath(entryPath: string): boolean {
  if (!entryPath || typeof entryPath !== "string") return false;
  if (entryPath.startsWith("/") || entryPath.startsWith("\\")) return false;

  const normalized = path.normalize(entryPath);
  if (normalized.startsWith("..") || normalized.includes("/..") || normalized.includes("\\..")) {
    return false;
  }

  return true;
}
