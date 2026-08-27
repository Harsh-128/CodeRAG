export type ExpectedResult = {
  file?: string;
  symbol?: string;
};

export type EvaluationCase = {
  id: string;
  question: string;
  repository: string;
  language?: string;
  expectedIntent?: string;
  expectedPath?: "symbol-navigation" | "rag";
  expectedResults?: ExpectedResult[];
};

export const evaluationCases: EvaluationCase[] = [
  {
    id: "request-flow-express",
    question: "How does Express handle a request?",
    repository: "express",
    expectedIntent: "request-flow",
    expectedPath: "rag",
    expectedResults: [
      {
        file: "lib/application.js",
        symbol: "handle",
      },
    ],
  },

  {
    id: "method-fetch-user",
    question: "Which method fetches the user?",
    repository: "multilang",
    expectedIntent: "method",
    expectedPath: "rag",
    expectedResults: [
      {
        file: "UserService.java",
        symbol: "getName",
      },
      {
        file: "UserService.ts",
        symbol: "getName",
      },
    ],
  },

  {
    id: "constructor-user-service",
    question: "Where is UserService instantiated?",
    repository: "multilang",
    expectedIntent: "symbol-navigation",
    expectedPath: "symbol-navigation",
    expectedResults: [
      {
        file: "UserServiceTest.java",
        symbol: "main",
      },
    ],
  },

  {
    id: "declaration-user-service",
    question: "Where is the UserService class defined?",
    repository: "multilang",
    expectedIntent: "symbol-navigation",
    expectedPath: "symbol-navigation",
    expectedResults: [
      {
        file: "UserService.java",
        symbol: "UserService",
      },
      {
        file: "UserService.ts",
        symbol: "UserService",
      },
    ],
  },

  {
    id: "hello-function",
    question: "What does the hello function do?",
    repository: "multilang",
    language: "javascript",
    expectedIntent: "method",
    expectedPath: "symbol-navigation",
    expectedResults: [
      {
        file: "App.js",
        symbol: "hello",
      },
    ],
  },

  {
    id: "getname-typescript",
    question: "What does the getName method do?",
    repository: "multilang",
    language: "typescript",
    expectedIntent: "method",
    expectedPath: "symbol-navigation",
    expectedResults: [
      {
        file: "UserService.ts",
        symbol: "getName",
      },
    ],
  },

  {
    id: "getname-java",
    question: "What does the getName method do?",
    repository: "multilang",
    language: "java",
    expectedIntent: "method",
    expectedPath: "symbol-navigation",
    expectedResults: [
      {
        file: "UserService.java",
        symbol: "getName",
      },
    ],
  },

  {
    id: "userservice-usage",
    question: "Where is UserService used?",
    repository: "multilang",
    expectedIntent: "symbol-navigation",
    expectedPath: "symbol-navigation",
    expectedResults: [
      {
        file: "UserServiceTest.java",
      },
    ],
  },

  {
    id: "getname-usage",
    question: "Where is getName called?",
    repository: "multilang",
    expectedIntent: "symbol-navigation",
    expectedPath: "symbol-navigation",
    expectedResults: [
      {
        file: "UserServiceTest.java",
      },
    ],
  },

  {
    id: "userservice-methods",
    question: "Which methods belong to UserService?",
    repository: "multilang",
    expectedIntent: "symbol-navigation",
    expectedPath: "symbol-navigation",
    expectedResults: [
      {
        file: "UserService.ts",
        symbol: "getName",
      },
      {
        file: "UserService.java",
        symbol: "getName",
      },
      {
        file: "UserService.ts",
        symbol: "constructor",
      },
    ],
  },

  {
    id: "hello-definition",
    question: "Where is the hello function defined?",
    repository: "multilang",
    language: "javascript",
    expectedIntent: "symbol-navigation",
    expectedPath: "symbol-navigation",
    expectedResults: [
      {
        file: "App.js",
        symbol: "hello",
      },
    ],
  },

  {
    id: "userservice-definition-typescript",
    question: "Where is the UserService class defined?",
    repository: "multilang",
    language: "typescript",
    expectedIntent: "symbol-navigation",
    expectedPath: "symbol-navigation",
    expectedResults: [
      {
        file: "UserService.ts",
        symbol: "UserService",
      },
    ],
  },

  {
    id: "userservice-definition-java",
    question: "Where is the UserService class defined?",
    repository: "multilang",
    language: "java",
    expectedIntent: "symbol-navigation",
    expectedPath: "symbol-navigation",
    expectedResults: [
      {
        file: "UserService.java",
        symbol: "UserService",
      },
    ],
  },

  {
    id: "constructor-typescript",
    question: "Where is the UserService constructor?",
    repository: "multilang",
    language: "typescript",
    expectedIntent: "constructor",
    expectedPath: "rag",
    expectedResults: [
      {
        file: "UserService.ts",
        symbol: "constructor",
      },
    ],
  },

  {
    id: "constructor-java",
    question: "Where is the UserService constructor?",
    repository: "multilang",
    language: "java",
    expectedIntent: "constructor",
    expectedPath: "rag",
    expectedResults: [
      {
        file: "UserService.java",
        symbol: "UserService",
      },
    ],
  },

  {
    id: "getname-return-typescript",
    question: "What does getName return?",
    repository: "multilang",
    language: "typescript",
    expectedIntent: "method",
    expectedPath: "symbol-navigation",
    expectedResults: [
      {
        file: "UserService.ts",
        symbol: "getName",
      },
    ],
  },

  {
    id: "getname-return-java",
    question: "What does getName return?",
    repository: "multilang",
    language: "java",
    expectedIntent: "method",
    expectedPath: "symbol-navigation",
    expectedResults: [
      {
        file: "UserService.java",
        symbol: "getName",
      },
    ],
  },

  {
    id: "calculator-add",
    question: "What does the add method do?",
    repository: "multilang",
    expectedIntent: "method",
    expectedPath: "symbol-navigation",
    expectedResults: [
      {
        file: "main.py",
        symbol: "add",
      },
    ],
  },

  {
    id: "calculate-total",
    question: "What does calculate_total do?",
    repository: "multilang",
    expectedIntent: "method",
    expectedPath: "symbol-navigation",
    expectedResults: [
      {
        file: "main.py",
        symbol: "calculate_total",
      },
    ],
  },

  {
    id: "calculator-methods",
    question: "Which methods belong to Calculator?",
    repository: "multilang",
    expectedIntent: "symbol-navigation",
    expectedPath: "symbol-navigation",
    expectedResults: [
      {
        file: "main.py",
        symbol: "add",
      },
    ],
  },

  {
    id: "hello-work",
    question: "What does the hello function work?",
    repository: "multilang",
    language: "javascript",
    expectedIntent: "method",
    expectedPath: "symbol-navigation",
    expectedResults: [
      {
        file: "App.js",
        symbol: "hello",
      },
    ],
  },

  {
    id: "getname-implementation",
    question: "Where is the getName method implemented?",
    repository: "multilang",
    language: "typescript",
    expectedIntent: "symbol-navigation",
    expectedPath: "symbol-navigation",
    expectedResults: [
      {
        file: "UserService.ts",
        symbol: "getName",
      },
    ],
  },

  {
    id: "userservice-definition-short",
    question: "Where is UserService defined?",
    repository: "multilang",
    language: "typescript",
    expectedIntent: "symbol-navigation",
    expectedPath: "symbol-navigation",
    expectedResults: [
      {
        file: "UserService.ts",
        symbol: "UserService",
      },
    ],
  },

  {
    id: "getname-invoked",
    question: "Where is getName invoked?",
    repository: "multilang",
    language: "typescript",
    expectedIntent: "symbol-navigation",
    expectedPath: "symbol-navigation",
    expectedResults: [
      {
        file: "UserServiceTest.java",
      },
    ],
  },

  {
    id: "userservice-referenced",
    question: "Where is UserService referenced?",
    repository: "multilang",
    expectedIntent: "symbol-navigation",
    expectedPath: "symbol-navigation",
    expectedResults: [
      {
        file: "UserServiceTest.java",
      },
    ],
  },

  {
    id: "calculator-add-definition",
    question: "Where is the add function defined?",
    repository: "multilang",
    expectedIntent: "symbol-navigation",
    expectedPath: "symbol-navigation",
    expectedResults: [
      {
        file: "main.py",
        symbol: "add",
      },
    ],
  },

  {
    id: "calculator-add-do",
    question: "What does add do?",
    repository: "multilang",
    expectedIntent: "method",
    expectedPath: "symbol-navigation",
    expectedResults: [
      {
        file: "main.py",
        symbol: "add",
      },
    ],
  },

  {
    id: "calculator-method-list",
    question: "What methods belong to Calculator?",
    repository: "multilang",
    expectedIntent: "symbol-navigation",
    expectedPath: "symbol-navigation",
    expectedResults: [
      {
        file: "main.py",
        symbol: "add",
      },
    ],
  },

  {
    id: "getname-what-work",
    question: "What does getName work?",
    repository: "multilang",
    language: "typescript",
    expectedIntent: "method",
    expectedPath: "symbol-navigation",
    expectedResults: [
      {
        file: "UserService.ts",
        symbol: "getName",
      },
    ],
  },

  {
    id: "user-service-created",
    question: "Where is UserService created?",
    repository: "multilang",
    expectedIntent: "constructor",
    expectedPath: "rag",
    expectedResults: [
      {
        file: "UserServiceTest.java",
        symbol: "main",
      },
    ],
  },
];
