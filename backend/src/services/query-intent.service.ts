export type QueryIntent =
  | "symbol-navigation"
  | "repository-inventory"
  | "request-flow"
  | "method"
  | "constructor"
  | "declaration"
  | "general";

export function detectQueryIntent(query: string): QueryIntent {
  const normalized = query.toLowerCase().trim();

  if (
    /\b(request|requests|response|responses|middleware|route|routing|dispatch|req|res|next)\b/.test(
      normalized,
    )
  ) {
    return "request-flow";
  }

  if (
    /\b(method|function|return|returns|get|gets|fetch|fetches|retrieve|retrieves|find|finds|calculate|calculates|call|calls)\b/.test(
      normalized,
    )
  ) {
    return "method";
  }

  if (
    /\b(handle|handles|process|processes)\b/.test(normalized) &&
    !/\b(request|requests|response|responses|middleware|route|routing|dispatch)\b/.test(
      normalized,
    )
  ) {
    return "method";
  }

  if (
    /\b(construct|constructed|constructor|instantiate|instantiated|instance|created|create|new)\b/.test(
      normalized,
    )
  ) {
    return "constructor";
  }

  if (
    /\b(class|interface|enum|record|type|struct|definition|defined)\b/.test(
      normalized,
    )
  ) {
    return "declaration";
  }

  if (
    /\b(where is|where are|find|locate|what does|what is|show me)\b/.test(
      normalized,
    ) &&
    /\b(symbol|function|method|class|implementation|defined|used|usage)\b/.test(
      normalized,
    ) &&
    !/\b(do|does|return|returns|get|gets|fetch|fetches|retrieve|retrieves|find|finds|calculate|calculates|call|calls|handle|handles|process|processes)\b/.test(
      normalized,
    )
  ) {
    return "symbol-navigation";
  }

  if (
    /\b(repository|codebase|project|files|directories|tree|architecture|structure|modules|components)\b/.test(
      normalized,
    )
  ) {
    return "repository-inventory";
  }

  return "general";
}
