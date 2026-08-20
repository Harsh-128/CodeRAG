import { QdrantClient } from "@qdrant/js-client-rest";
import {
  COLLECTION_NAME,
  VectorPayload,
} from "./vector.service.js";

const qdrant = new QdrantClient({
  url: "http://localhost:6333",
});

export interface SymbolSearchResult {
  id: string | number;
  payload: VectorPayload & {
    chunkId?: string;
    usageLine?: number;
    usageContent?: string;
  };
}

export async function findSymbol(
  symbolName: string,
  repositoryName?: string,
  language?: string,
  limit = 10
): Promise<SymbolSearchResult[]> {
  const must: Array<Record<string, unknown>> = [];

  if (repositoryName) {
    must.push({
      key: "repository",
      match: {
        value: repositoryName,
      },
    });
  }

  if (language) {
    must.push({
      key: "language",
      match: {
        value: language,
      },
    });
  }

  const response = await qdrant.scroll(
    COLLECTION_NAME,
    {
      limit: 1000,
      with_payload: true,
      with_vector: false,
      filter: {
        must,
      },
    }
  );

  const normalizedSymbolName = symbolName.toLowerCase();

  return response.points
    .map((point) => ({
      id: point.id,
      payload: point.payload as SymbolSearchResult["payload"],
    }))
    .filter(
      (result) =>
        result.payload.symbolName?.toLowerCase() ===
        normalizedSymbolName
    )
    .slice(0, limit);
}

export async function findSymbolsByParent(
  parentName: string,
  repositoryName?: string,
  language?: string,
  limit = 20
): Promise<SymbolSearchResult[]> {
  const must: Array<Record<string, unknown>> = [
    {
      key: "parentName",
      match: {
        value: parentName,
      },
    },
  ];

  if (repositoryName) {
    must.push({
      key: "repository",
      match: {
        value: repositoryName,
      },
    });
  }

  if (language) {
    must.push({
      key: "language",
      match: {
        value: language,
      },
    });
  }

  const response = await qdrant.scroll(
    COLLECTION_NAME,
    {
      limit,
      with_payload: true,
      with_vector: false,
      filter: {
        must,
      },
    }
  );

  return response.points.map((point) => ({
    id: point.id,
    payload: point.payload as SymbolSearchResult["payload"],
  }));
}

export async function findSymbolsByFile(
  filePath: string,
  repositoryName?: string,
  limit = 50
): Promise<SymbolSearchResult[]> {
  const must: Array<Record<string, unknown>> = [
    {
      key: "filePath",
      match: {
        value: filePath,
      },
    },
  ];

  if (repositoryName) {
    must.push({
      key: "repository",
      match: {
        value: repositoryName,
      },
    });
  }

  const response = await qdrant.scroll(
    COLLECTION_NAME,
    {
      limit,
      with_payload: true,
      with_vector: false,
      filter: {
        must,
      },
    },
  );

  return response.points.map((point) => ({
    id: point.id,
    payload: point.payload as SymbolSearchResult["payload"],
  }));
}

async function findSymbolUsages(
  symbolName: string,
  repositoryName?: string,
  language?: string
): Promise<SymbolSearchResult[]> {
  const must: any[] = [];

  if (repositoryName) {
    must.push({
      key: "repository",
      match: {
        value: repositoryName,
      },
    });
  }

  if (language) {
    must.push({
      key: "language",
      match: {
        value: language,
      },
    });
  }

const points: SymbolSearchResult[] = [];

let offset: Awaited<
  ReturnType<typeof qdrant.scroll>
>["next_page_offset"] = null;

do {
  const response = await qdrant.scroll(
    COLLECTION_NAME,
    {
      limit: 100,
      offset: offset ?? undefined,
      with_payload: true,
      with_vector: false,
      filter: {
        must,
      },
    }
  );

  points.push(
    ...response.points.map((point) => ({
      id: point.id,
      payload:
        point.payload as SymbolSearchResult["payload"],
    }))
  );

  offset = response.next_page_offset;
} while (offset !== null);
  const escaped = symbolName.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

  const usageRegex = new RegExp(
    `\\b${escaped}\\b`
  );

  const declarationTypes = new Set([
    "class_declaration",
    "interface_declaration",
    "enum_declaration",
    "record_declaration",
    "type_declaration",
    "class_definition",
    "function_declaration",
    "function_definition",
    "method_declaration",
    "method_definition",
    "constructor_declaration",
  ]);

  const normalizedTarget =
    symbolName.toLowerCase();

  return points.filter((result) => {
      const payload = result.payload;

      if (!payload.content) {
        return false;
      }

      const normalizedSymbol =
        payload.symbolName?.toLowerCase();

      if (
        normalizedSymbol === normalizedTarget &&
        declarationTypes.has(
          payload.symbolType?.toLowerCase() ?? ""
        )
      ) {
        return false;
      }

      if (
        declarationTypes.has(
          payload.symbolType?.toLowerCase() ?? ""
        ) &&
        (
          payload.symbolType === "class_declaration" ||
          payload.symbolType === "class_definition" ||
          payload.symbolType === "interface_declaration" ||
          payload.symbolType === "enum_declaration" ||
          payload.symbolType === "record_declaration" ||
          payload.symbolType === "type_declaration"
        )
      ) {
        return false;
      }

      const match =
        usageRegex.exec(payload.content);

      if (!match) {
        return false;
      }

      const contentBeforeMatch =
        payload.content.slice(
          0,
          match.index
        );

      const relativeLine =
        contentBeforeMatch.split("\n").length - 1;

      payload.usageLine =
        payload.startLine + relativeLine;
        const matchedLine =
  payload.content.split("\n")[relativeLine];

payload.usageContent =
  matchedLine?.trim() ?? symbolName;

      return true;
    });
}

export function isSymbolNavigationQuestion(
  question: string
): boolean {
  const normalized = question
    .toLowerCase()
    .replace(/[^a-z0-9_$]+/g, " ")
    .trim();

  /*
   * Direct navigation keywords.
   *
   * These questions are explicitly asking where a
   * symbol is defined, used, called, etc.
   */
  if (
    /\b(where|defined|definition|constructed|constructor|created|located|used|usage|usages|referenced|references|reference|called|calls|invoked|invocations|instantiated|instantiation)\b/
      .test(normalized)
  ) {
    return true;
  }

  /*
   * "What does X do?" / "How does X work?"
   *
   * Only classify these as symbol navigation when
   * the question actually contains a code symbol and
   * method/function terminology.
   *
   * This prevents repository questions such as:
   * "How does user data flow through this repository?"
   * from being treated as symbol navigation.
   */
  const explanatoryNavigation =
    /\b(does|work)\b/.test(normalized) &&
    /\b(method|function|class)\b/.test(normalized);

  if (explanatoryNavigation) {
    const identifiers = question.match(
      /\b[A-Za-z_$][A-Za-z0-9_$]*\b/g
    );

    const ignoredWords = new Set([
      "what",
      "does",
      "how",
      "the",
      "method",
      "methods",
      "function",
      "functions",
      "class",
      "work",
      "do",
      "this",
    ]);

    const hasSymbol = identifiers?.some(
      (identifier) =>
        !ignoredWords.has(
          identifier.toLowerCase()
        )
    );

    return Boolean(hasSymbol);
  }

  return false;
}

export async function lookupSymbolsForQuestion(
  question: string,
  repositoryName?: string,
  language?: string
): Promise<SymbolSearchResult[]> {
  const normalized = question
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, " ")
    .trim();

  /*
   * Questions asking what methods/functions belong
   * to a class should search by parentName.
   *
   * Example:
   *   What methods belong to UserService?
   */
  const parentMatch = question.match(
    /(?:methods?|functions?)\s+(?:belong\s+to|of)\s+([A-Za-z_$][A-Za-z0-9_$]*)/i
  );

  if (parentMatch) {
    return findSymbolsByParent(
      parentMatch[1],
      repositoryName,
      language
    );
  }
    /*
   * Questions asking what symbols/functions/classes
   * are inside a specific file should search by filePath.
   *
   * Example:
   *   What functions are inside lib/application.js?
   */
  const fileMatch = question.match(
    /\b(?:inside|within|in)\s+([A-Za-z0-9_./-]+\.[A-Za-z0-9]+)\b/i
  );

  if (
    fileMatch &&
    /\b(functions?|methods?|symbols?|classes?)\b/i.test(
      question
    )
  ) {
    return findSymbolsByFile(
      fileMatch[1],
      repositoryName
    );
  }

  /*
   * Questions asking where something is defined,
   * constructed, created, instantiated, or located
   * should prefer exact symbol lookup.
   */
  const usageQuestion =
  /\b(used|usage|usages|referenced|references|reference|called|calls|invoked|invocations|instantiated|instantiation)\b/
    .test(normalized);

const navigationQuestion = isSymbolNavigationQuestion(question);
  if (!navigationQuestion) {
    return [];
  }

  /*
   * Extract an identifier from the question.
   *
   * Prefer a backtick-wrapped symbol:
   *   Where is `UserService` defined?
   */
  const backtickMatch = question.match(
    /`([A-Za-z_$][A-Za-z0-9_$]*)`/
  );

  if (backtickMatch) {
  const symbolName = backtickMatch[1];

  if (usageQuestion) {
    return findSymbolUsages(
      symbolName,
      repositoryName,
      language
    );
  }

  return findSymbol(
    symbolName,
    repositoryName,
    language
  );
}

  /*
   * Otherwise look for code-like identifiers.
   */
  const identifiers = question.match(
  /\b[A-Za-z_$][A-Za-z0-9_$]*\b/g
);

if (!identifiers || identifiers.length === 0) {
  return [];
}

const ignoredWords = new Set([
  "references",
  "calls",
  "does",
  "do",
  "invocations",
  "instantiation",
  "where",
  "what",
  "which",
  "who",
  "how",
  "when",
  "why",
  "show",
  "tell",
  "is",
  "are",
  "was",
  "were",
  "the",
  "a",
  "an",
  "in",
  "of",
    "all",
  "implementation",
  "implementations",
  "method",
  "methods",
  "function",
  "functions",
  "class",
  "classes",
  "me",
  "to",
  "for",
  "from",
  "on",
  "at",
  "defined",
  "definition",
  "used",
  "usage",
  "referenced",
  "reference",
  "called",
  "invoked",
  "created",
  "located",
]);

const symbolName =
  identifiers.find(
    (identifier) =>
      !ignoredWords.has(identifier.toLowerCase())
  ) ?? identifiers[0];

if (usageQuestion) {
  return findSymbolUsages(
    symbolName,
    repositoryName,
    language
  );
}

return findSymbol(
  symbolName,
  repositoryName,
  language
);
}

export interface RepositorySymbolInventory {
  repository: string;
  files: string[];
  fileInventory: Array<{
    filePath: string;
    language: string;
    symbols: Array<{
      name: string;
      type: string;
      parentName?: string;
      startLine: number;
      endLine: number;
    }>;
  }>;
  symbols: Array<{
    name: string;
    type: string;
    filePath: string;
    parentName?: string;
    language: string;
    startLine: number;
    endLine: number;
  }>;
}

export async function getRepositorySymbolInventory(
  repositoryName: string
): Promise<RepositorySymbolInventory> {
  const files = new Set<string>();
  const symbols = new Map<string, RepositorySymbolInventory["symbols"][number]>();

  const fileSymbols = new Map<
    string,
    RepositorySymbolInventory["fileInventory"][number]
  >();

  let offset: Awaited<
    ReturnType<typeof qdrant.scroll>
  >["next_page_offset"] = null;

  do {
      const response = await qdrant.scroll(
        COLLECTION_NAME,
      {
        limit: 1000,
        offset: offset ?? undefined,
        with_payload: true,
        with_vector: false,
        filter: {
        must: [
          {
            key: "repository",
            match: {
              value: repositoryName,
            },
          },
        ],
      },
    });

    for (const point of response.points) {
      const payload =
        point.payload as VectorPayload;

      if (payload.filePath) {
        files.add(payload.filePath);

        if (!fileSymbols.has(payload.filePath)) {
          fileSymbols.set(payload.filePath, {
            filePath: payload.filePath,
            language: payload.language,
            symbols: [],
          });
        }
      }

      if (
        !payload.symbolName ||
        !payload.symbolType ||
        !payload.filePath
      ) {
        continue;
      }

      const symbolKey = [
        payload.filePath,
        payload.symbolName,
        payload.symbolType,
        payload.parentName ?? "",
        payload.startLine,
        payload.endLine,
      ].join(":");

      const symbol = {
        name: payload.symbolName,
        type: payload.symbolType,
        filePath: payload.filePath,
        parentName: payload.parentName,
        language: payload.language,
        startLine: payload.startLine,
        endLine: payload.endLine,
      };

      if (!symbols.has(symbolKey)) {
        symbols.set(symbolKey, symbol);
      }

      const fileEntry = fileSymbols.get(
        payload.filePath
      )!;

      const alreadyInFile =
        fileEntry.symbols.some(
          (existing) =>
            existing.name === symbol.name &&
            existing.type === symbol.type &&
            existing.parentName ===
              symbol.parentName &&
            existing.startLine ===
              symbol.startLine &&
            existing.endLine ===
              symbol.endLine
        );

      if (!alreadyInFile) {
        fileEntry.symbols.push({
          name: symbol.name,
          type: symbol.type,
          parentName: symbol.parentName,
          startLine: symbol.startLine,
          endLine: symbol.endLine,
        });
      }
    }

    offset = response.next_page_offset ?? null;
  } while (offset !== null);

  return {
    repository: repositoryName,
    files: Array.from(files).sort(),
    fileInventory: Array.from(
      fileSymbols.values()
    )
      .map((file) => ({
        ...file,
        symbols: file.symbols.sort(
          (a, b) =>
            a.startLine - b.startLine ||
            a.name.localeCompare(b.name)
        ),
      }))
      .sort((a, b) =>
        a.filePath.localeCompare(b.filePath)
      ),
    symbols: Array.from(symbols.values()).sort(
      (a, b) =>
        a.filePath.localeCompare(b.filePath) ||
        a.startLine - b.startLine ||
        a.name.localeCompare(b.name)
    ),
  };
}
export function isRepositoryInventoryQuestion(
  question: string
): boolean {
  const normalized = question
    .toLowerCase()
    .replace(/[^a-z0-9_$]+/g, " ")
    .trim();

    return (
  /\b(main\s+modules?|main\s+directories?|module\s+overview)\b/.test(
    normalized
  ) ||
  /\b(tree|folder\s+structure|directory\s+structure)\b/.test(
    normalized
  ) ||
  /\b(repository|codebase|project)\s+(structure|overview)\b/.test(
    normalized
  ) ||
  /\bwhat\s+is\s+the\s+(structure|overview)\s+of\s+(this\s+)?(repository|codebase|project)\b/.test(
    normalized
  ) ||
  /\bwhat\s+(files|symbols|functions|classes)\b/.test(
    normalized
  ) ||
  /\b(project|repository|codebase)\s+files\b/.test(
    normalized
  ) ||
  /\b(what\s+)?(directories|directory|folders|folder)\b/.test(
    normalized
  ) ||
  /\b(inside|within)\s+[a-z0-9_-]+\b/.test(
    normalized
  ) ||
  /\bcomponents\b/.test(normalized)
);
}
export type RepositoryInventoryQuestionType =
  | "files"
  | "symbols"
  | "directories"
  | "directory_contents"
  | "tree"
  | "module_overview"
  | "overview";

export function getRepositoryInventoryQuestionType(
  question: string
): RepositoryInventoryQuestionType {
  const normalized = question
    .toLowerCase()
    .replace(/[^a-z0-9_$]+/g, " ")
    .trim();

  if (/\b(files?|file)\b/.test(normalized)) {
  return "files";
}
if (
  /\b(main\s+modules?|main\s+directories?|module\s+overview)\b/.test(
    normalized
  )
) {
  return "module_overview";
}

if (
  /\b(tree|folder\s+structure|directory\s+structure)\b/.test(
    normalized
  )
) {
  return "tree";
}

if (
  /\b(directory|directories|folder|folders)\b/.test(
    normalized
  )
) {
  return "directories";
}

if (
  /\b(inside|within)\s+[a-z0-9_./-]+/.test(
    normalized
  )
) {
  return "directory_contents";
}

if (
  /\b(functions?|methods?|symbols?|classes?)\b/.test(
    normalized
  )
) {
  return "symbols";
}

  return "overview";
}
export function extractRepositoryDirectory(
  question: string
): string | null {
  const normalized = question
    .toLowerCase()
    .replace(/[^a-z0-9_./-]+/g, " ")
    .trim();

  const match = normalized.match(
    /\b(?:inside|within)\s+([a-z0-9_./-]+)/
  );

  return match?.[1] ?? null;
}
export function buildRepositoryDirectories(
  inventory: RepositorySymbolInventory
): string[] {
  const directories = new Set<string>();

  for (const filePath of inventory.files) {
    const parts = filePath.split("/");

    if (parts.length <= 1) {
      continue;
    }

    for (let i = 1; i < parts.length; i++) {
      directories.add(parts.slice(0, i).join("/"));
    }
  }

  return Array.from(directories).sort();
}
export function buildRepositoryDirectoryContents(
  inventory: RepositorySymbolInventory,
  directory: string
): string[] {
  const normalizedDirectory = directory
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();

  const prefix = `${normalizedDirectory}/`;

  return inventory.files
    .filter((filePath) => {
      const normalizedFilePath = filePath.toLowerCase();

      return (
        normalizedFilePath.startsWith(prefix) &&
        !normalizedFilePath
          .slice(prefix.length)
          .includes("/")
      );
    })
    .sort();
}
export function buildRepositoryTree(
  inventory: RepositorySymbolInventory
): string {
  const root: {
    directories: Map<string, any>;
    files: string[];
  } = {
    directories: new Map(),
    files: [],
  };

  for (const filePath of inventory.files) {
    const parts = filePath.split("/");
    let current = root;

    for (let i = 0; i < parts.length - 1; i++) {
      const directory = parts[i];

      if (!current.directories.has(directory)) {
        current.directories.set(directory, {
          directories: new Map(),
          files: [],
        });
      }

      current = current.directories.get(directory);
    }

    current.files.push(parts[parts.length - 1]);
  }

  const lines: string[] = [];

  function render(
    node: {
      directories: Map<string, any>;
      files: string[];
    },
    prefix: string
  ) {
    const directories = Array.from(
      node.directories.keys()
    ).sort();

    const files = [...node.files].sort();

    const entries = [
      ...directories.map((name) => ({
        name,
        type: "directory" as const,
      })),
      ...files.map((name) => ({
        name,
        type: "file" as const,
      })),
    ];

    entries.forEach((entry, index) => {
      const isLast = index === entries.length - 1;
      const connector = isLast ? "└── " : "├── ";

      lines.push(
        `${prefix}${connector}${entry.name}${
          entry.type === "directory" ? "/" : ""
        }`
      );

      if (entry.type === "directory") {
        const child = node.directories.get(
          entry.name
        );

        render(
          child,
          `${prefix}${isLast ? "    " : "│   "}`
        );
      }
    });
  }

  lines.push(`${inventory.repository}/`);
  render(root, "");

  return lines.join("\n");
}
export function buildRepositoryModuleOverview(
  inventory: RepositorySymbolInventory
): string {
  const directories = buildRepositoryDirectories(
    inventory
  );

  const topLevelDirectories = directories.filter(
    (directory) => !directory.includes("/")
  );

  const lines = [
    `Repository: ${inventory.repository}`,
    "",
    "Main modules/directories:",
  ];

  for (const directory of topLevelDirectories) {
    const prefix = `${directory}/`;

    const files = inventory.files.filter(
      (filePath) =>
        filePath.startsWith(prefix) &&
        !filePath
          .slice(prefix.length)
          .includes("/")
    );

    const childDirectories = directories.filter(
      (child) =>
        child.startsWith(prefix) &&
        !child.slice(prefix.length).includes("/")
    );

    lines.push(
      `- ${directory}/ — ${files.length} files, ${childDirectories.length} subdirectories`
    );
  }

  return lines.join("\n");
}

export function buildRepositoryOverview(
  inventory: RepositorySymbolInventory
): string {
  const languageCounts = new Map<string, number>();

  for (const file of inventory.fileInventory) {
    languageCounts.set(
      file.language,
      (languageCounts.get(file.language) ?? 0) + 1
    );
  }

  const languageLines = Array.from(
    languageCounts.entries()
  )
    .sort((a, b) => b[1] - a[1])
    .map(
      ([language, count]) =>
        `- ${language}: ${count} files`
    );

  return [
    `Repository: ${inventory.repository}`,
    `Files: ${inventory.files.length}`,
    `Symbols: ${inventory.symbols.length}`,
    "",
    "Languages:",
    ...languageLines,
  ].join("\n");
}
