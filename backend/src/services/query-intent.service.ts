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

  /*
   * Request-flow has highest priority.
   */
  if (
    /\b(request|requests|response|responses|middleware|route|routing|dispatch|req|res|next)\b/.test(
      normalized,
    )
  ) {
    return "request-flow";
  }

  /*
 * Questions asking which methods/functions belong
 * to a class are symbol-navigation questions.
 *
 * Example:
 *   Which methods belong to UserService?
 */
if (
  /\b(which|what)\s+(methods?|functions?)\s+(belong\s+to|of)\b/.test(
    normalized,
  )
) {
  return "symbol-navigation";
}

/*
 * Explicit symbol-navigation questions asking where
 * a symbol or class is defined.
 */
if (
  /\b(where is|where are|find|locate|show me)\b/.test(normalized) &&
  /\b(defined|definition)\b/.test(normalized)
) {
  return "symbol-navigation";
}

/*
 * Explanatory symbol questions remain method questions.
 */
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

  /*
   * Explicit symbol-navigation questions involving
   * instantiation should not be classified as
   * constructor questions.
   */
  if (
    /\b(where is|where are|find|locate|show me)\b/.test(normalized) &&
    /\b(instantiated|instantiation)\b/.test(normalized)
  ) {
    return "symbol-navigation";
  }

  /*
   * Constructor questions.
   */
  if (
    /\b(construct|constructed|constructor|instantiate|instantiated|instance|created|create|new)\b/.test(
      normalized,
    )
  ) {
    return "constructor";
  }

  /*
   * Explicit symbol-navigation questions asking where
   * a symbol or class is defined.
   */
  if (
    /\b(where is|where are|find|locate|show me)\b/.test(normalized) &&
    /\b(defined|definition)\b/.test(normalized)
  ) {
    return "symbol-navigation";
  }

  /*
   * Declaration questions.
   */
  if (
    /\b(class|interface|enum|record|type|struct|definition|defined)\b/.test(
      normalized,
    )
  ) {
    return "declaration";
  }

  /*
   * General explicit symbol-navigation questions.
   */
  if (
    /\b(where is|where are|find|locate|what does|what is|show me)\b/.test(
      normalized,
    ) &&
    /\b(symbol|function|method|class|implementation|defined|used|usage|called|calls|invoked|referenced)\b/.test(
      normalized,
    ) &&
    !/\b(do|does|return|returns|get|gets|fetch|fetches|retrieve|retrieves|find|finds|calculate|calculates|call|calls|handle|handles|process|processes)\b/.test(
      normalized,
    )
  ) {
    return "symbol-navigation";
  }

    /*
   * Repository questions.
   */
  if (
    /\b(repository|codebase|project|files|directories|tree|architecture|structure|modules|components)\b/.test(
      normalized,
    )
  ) {
    return "repository-inventory";
  }

  /*
   * Questions asking what a specific symbol does.
   *
   * Examples:
   *   What does calculate_total do?
   *   What does hello do?
   */
  if (
    /\bwhat\s+does\s+[A-Za-z_$][A-Za-z0-9_$]*\s+(do|work)\b/i.test(query)
  ) {
    return "method";
  }

  return "general";
}