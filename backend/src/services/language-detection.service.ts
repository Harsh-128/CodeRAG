import type { SupportedLanguage } from "./code-parser.service.js";

const EXTENSION_LANGUAGE_MAP: Record<
  string,
  SupportedLanguage
> = {
  ".js": "javascript",
  ".jsx": "javascript",
  ".ts": "typescript",
  ".tsx": "typescript",

  ".py": "python",

  ".go": "go",

  ".java": "java",
};

export function detectLanguage(
  filePath: string
): SupportedLanguage | null {
  const lowerPath = filePath.toLowerCase();

  const lastDot = lowerPath.lastIndexOf(".");

  if (lastDot === -1) {
    return null;
  }

  const extension =
    lowerPath.slice(lastDot);

  return EXTENSION_LANGUAGE_MAP[
    extension
  ] ?? null;
}
