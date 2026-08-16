export interface CodeChunk {
  id: string;
  repository: string;
  filePath: string;
  language: string;
  symbolName?: string;
  symbolType: string;
  startLine: number;
  endLine: number;
  content: string;
}