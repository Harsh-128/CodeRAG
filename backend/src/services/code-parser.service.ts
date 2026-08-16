import Parser from "tree-sitter";
import JavaScript from "tree-sitter-javascript";

const parser = new Parser();

parser.setLanguage(JavaScript);

export interface CodeNode {
  type: string;
  name?: string;
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
  code: string;
}

export function parseJavaScriptCode(
  sourceCode: string
): CodeNode[] {
  const tree = parser.parse(sourceCode);
  const nodes: CodeNode[] = [];

  function walk(node: Parser.SyntaxNode): void {
    const interestingTypes = new Set([
      "function_declaration",
      "function",
      "arrow_function",
      "method_definition",
      "class_declaration",
    ]);

    if (interestingTypes.has(node.type)) {
      let name: string | undefined;

      const nameNode = node.childForFieldName("name");

      if (nameNode) {
        name = nameNode.text;
      }

      nodes.push({
        type: node.type,
        name,
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        startColumn: node.startPosition.column,
        endColumn: node.endPosition.column,
        code: node.text,
      });
    }

    for (const child of node.namedChildren) {
      walk(child);
    }
  }

  walk(tree.rootNode);

  return nodes;
}