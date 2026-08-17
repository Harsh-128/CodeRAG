import Parser from "tree-sitter";
import JavaScript from "tree-sitter-javascript";
import Python from "tree-sitter-python";
import Go from "tree-sitter-go";
import {
  parse as parseJava,
  type CstNode,
  type IToken,
} from "java-parser";

export type SupportedLanguage =
  | "javascript"
  | "typescript"
  | "python"
  | "go"
  | "java";

export interface CodeNode {
  type: string;
  name?: string;
  parentName?: string;
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
  code: string;
}

function getLanguageGrammar(
  language: SupportedLanguage
) {
  switch (language) {
    case "javascript":
    case "typescript":
      return JavaScript;

    case "python":
      return Python;

    case "go":
      return Go;

    case "java":
      throw new Error(
        "Java uses java-parser instead of tree-sitter."
      );

    default:
      throw new Error(
        `Unsupported language: ${language}`
      );
  }
}

function getInterestingTypes(
  language: SupportedLanguage
): Set<string> {
  switch (language) {
    case "javascript":
    case "typescript":
      return new Set([
        "function_declaration",
        "function",
        "arrow_function",
        "method_definition",
        "class_declaration",
      ]);

    case "python":
      return new Set([
        "function_definition",
        "class_definition",
      ]);

    case "go":
      return new Set([
        "function_declaration",
        "method_declaration",
        "type_declaration",
      ]);

    case "java":
      return new Set();

    default:
      return new Set();
  }
}

function getNodeName(
  node: Parser.SyntaxNode
): string | undefined {
  const nameNode =
    node.childForFieldName("name");

  if (nameNode) {
    return nameNode.text;
  }

  if (node.type === "type_declaration") {
    const spec =
      node.namedChildren.find(
        (child) =>
          child.type === "type_spec"
      );

    if (spec) {
      const typeName =
        spec.childForFieldName("name");

      if (typeName) {
        return typeName.text;
      }
    }
  }

  return undefined;
}

function getGoMethodParentName(
  node: Parser.SyntaxNode
): string | undefined {
  const receiver =
    node.childForFieldName("receiver");

  if (!receiver) {
    return undefined;
  }

  const receiverText =
    receiver.text;

  const match =
    receiverText.match(
      /\b([A-Z_a-z][A-Za-z0-9_]*)\s*(?:\[.*\])?\s*\)?$/
    );

  if (!match) {
    return undefined;
  }

  return match[1];
}

/* -------------------------------------------------------------------------- */
/* Java CST helpers                                                            */
/* -------------------------------------------------------------------------- */

function isJavaCstNode(
  value: unknown
): value is CstNode {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    "children" in value &&
    "location" in value
  );
}

function getFirstTokenImage(
  node: CstNode,
  tokenName: string
): string | undefined {
  const children =
    node.children as Record<
      string,
      unknown
    >;

  const elements =
    children[tokenName];

  if (!Array.isArray(elements)) {
    return undefined;
  }

  const token =
    elements.find(
      (element): element is IToken =>
        typeof element === "object" &&
        element !== null &&
        "image" in element
    );

  return token?.image;
}

function getNestedCstNode(
  node: CstNode,
  childName: string
): CstNode | undefined {
  const children =
    node.children as Record<
      string,
      unknown
    >;

  const elements =
    children[childName];

  if (!Array.isArray(elements)) {
    return undefined;
  }

  return elements.find(
    isJavaCstNode
  );
}

function getJavaTypeIdentifierName(
  node: CstNode
): string | undefined {
  const typeIdentifier =
    getNestedCstNode(
      node,
      "typeIdentifier"
    );

  if (!typeIdentifier) {
    return undefined;
  }

  return getFirstTokenImage(
    typeIdentifier,
    "Identifier"
  );
}

function getJavaMethodName(
  node: CstNode
): string | undefined {
  const methodHeader =
    getNestedCstNode(
      node,
      "methodHeader"
    );

  if (!methodHeader) {
    return undefined;
  }

  const methodDeclarator =
    getNestedCstNode(
      methodHeader,
      "methodDeclarator"
    );

  if (!methodDeclarator) {
    return undefined;
  }

  return getFirstTokenImage(
    methodDeclarator,
    "Identifier"
  );
}

function getJavaConstructorName(
  node: CstNode
): string | undefined {
  const constructorDeclarator =
    getNestedCstNode(
      node,
      "constructorDeclarator"
    );

  if (!constructorDeclarator) {
    return undefined;
  }

  const simpleTypeName =
    getNestedCstNode(
      constructorDeclarator,
      "simpleTypeName"
    );

  if (!simpleTypeName) {
    return undefined;
  }

  const typeIdentifier =
    getNestedCstNode(
      simpleTypeName,
      "typeIdentifier"
    );

  if (!typeIdentifier) {
    return undefined;
  }

  return getFirstTokenImage(
    typeIdentifier,
    "Identifier"
  );
}

function getJavaInterfaceMethodName(
  node: CstNode
): string | undefined {
  const methodHeader =
    getNestedCstNode(
      node,
      "methodHeader"
    );

  if (!methodHeader) {
    return undefined;
  }

  const methodDeclarator =
    getNestedCstNode(
      methodHeader,
      "methodDeclarator"
    );

  if (!methodDeclarator) {
    return undefined;
  }

  return getFirstTokenImage(
    methodDeclarator,
    "Identifier"
  );
}

function getJavaNodeName(
  node: CstNode
): string | undefined {
  switch (node.name) {
    case "normalClassDeclaration":
    case "enumDeclaration":
    case "recordDeclaration":
    case "normalInterfaceDeclaration":
      return getJavaTypeIdentifierName(
        node
      );

    case "methodDeclaration":
      return getJavaMethodName(
        node
      );

    case "interfaceMethodDeclaration":
      return getJavaInterfaceMethodName(
        node
      );

    case "constructorDeclaration":
      return getJavaConstructorName(
        node
      );

    default:
      return undefined;
  }
}

function getJavaSemanticType(
  node: CstNode
): string | undefined {
  switch (node.name) {
    case "normalClassDeclaration":
      return "class_declaration";

    case "normalInterfaceDeclaration":
      return "interface_declaration";

    case "enumDeclaration":
      return "enum_declaration";

    case "recordDeclaration":
      return "record_declaration";

    case "methodDeclaration":
    case "interfaceMethodDeclaration":
      return "method_declaration";

    case "constructorDeclaration":
      return "constructor_declaration";

    default:
      return undefined;
  }
}

function createJavaCodeNode(
  node: CstNode,
  parentName?: string,
  sourceCode?: string
): CodeNode | undefined {
  const type =
    getJavaSemanticType(node);

  if (!type || !sourceCode) {
    return undefined;
  }

  const name =
    getJavaNodeName(node);

  const location =
    node.location;

  const startOffset =
    location.startOffset;

  const endOffset =
    location.endOffset;

  const code =
    sourceCode.slice(
      startOffset,
      endOffset + 1
    );

  return {
    type,
    name,
    parentName,
    startLine:
      location.startLine,
    endLine:
      location.endLine,
    startColumn:
      Math.max(
        0,
        location.startColumn - 1
      ),
    endColumn:
      Math.max(
        0,
        location.endColumn - 1
      ),
    code,
  };
}

function parseJavaCode(
  sourceCode: string
): CodeNode[] {
  const cst =
    parseJava(sourceCode);

  const nodes: CodeNode[] = [];

  function walk(
    node: CstNode,
    parentName?: string
  ): void {
    const semanticType =
      getJavaSemanticType(node);

    let currentParentName =
      parentName;

    if (semanticType) {
      const codeNode =
        createJavaCodeNode(
          node,
          parentName,
          sourceCode
        );

      if (codeNode) {
        nodes.push(codeNode);

        if (
          codeNode.type ===
            "class_declaration" ||
          codeNode.type ===
            "interface_declaration" ||
          codeNode.type ===
            "enum_declaration" ||
          codeNode.type ===
            "record_declaration"
        ) {
          if (codeNode.name) {
            currentParentName =
              codeNode.name;
          }
        }
      }
    }

    const children =
      node.children as Record<
        string,
        unknown
      >;

    for (const elements of Object.values(
      children
    )) {
      if (!Array.isArray(elements)) {
        continue;
      }

      for (const element of elements) {
        if (isJavaCstNode(element)) {
          walk(
            element,
            currentParentName
          );
        }
      }
    }
  }

  walk(cst);

  return nodes;
}

export function parseCode(
  sourceCode: string,
  language: SupportedLanguage
): CodeNode[] {
  if (language === "java") {
    return parseJavaCode(
      sourceCode
    );
  }

  const parser = new Parser();

  parser.setLanguage(
    getLanguageGrammar(language)
  );

  const tree =
    parser.parse(sourceCode);

  const nodes: CodeNode[] = [];

  const interestingTypes =
    getInterestingTypes(language);

  function walk(
    node: Parser.SyntaxNode,
    parentName?: string
  ): void {
    let currentParentName =
      parentName;

    if (
      interestingTypes.has(
        node.type
      )
    ) {
      const name =
        getNodeName(node);

      let resolvedParentName =
        parentName;

      if (
        language === "go" &&
        node.type ===
          "method_declaration"
      ) {
        resolvedParentName =
          getGoMethodParentName(
            node
          );
      }

      nodes.push({
        type: node.type,
        name,
        parentName:
          resolvedParentName,
        startLine:
          node.startPosition.row + 1,
        endLine:
          node.endPosition.row + 1,
        startColumn:
          node.startPosition.column,
        endColumn:
          node.endPosition.column,
        code: node.text,
      });

      if (name) {
        currentParentName =
          name;
      }
    }

    for (const child of node.namedChildren) {
      walk(
        child,
        currentParentName
      );
    }
  }

  walk(tree.rootNode);

  return nodes;
}

/**
 * Backwards-compatible wrapper
 * for existing JavaScript tests.
 */
export function parseJavaScriptCode(
  sourceCode: string
): CodeNode[] {
  return parseCode(
    sourceCode,
    "javascript"
  );
}
