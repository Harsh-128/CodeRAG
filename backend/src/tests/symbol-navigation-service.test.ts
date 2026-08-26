import test from "node:test";
import assert from "node:assert/strict";


import {
  buildSymbolNavigationResponse,
} from "../services/symbol-navigation.service.js";

test("builds file-scoped function navigation response", () => {
  const results = [
    {
      id: 1,
      score: 1,
      payload: {
        repository: "multilang",
        filePath: "src/App.js",
        symbolName: "hello",
        parentName: undefined,
        language: "javascript",
        symbolType: "function_declaration",
        startLine: 10,
        endLine: 15,
        content: "function hello() {}",
      },
    },
    {
      id: 2,
      score: 0.9,
      payload: {
        repository: "multilang",
        filePath: "src/App.js",
        symbolName: "User",
        parentName: undefined,
        language: "javascript",
        symbolType: "class_declaration",
        startLine: 20,
        endLine: 30,
        content: "class User {}",
      },
    },
  ];

  const response = buildSymbolNavigationResponse(
    "What functions are inside src/App.js?",
    results,
  );

  assert.equal(response.mode, "symbol-navigation");
  assert.equal(
    response.answer,
    "Functions in the requested file:\n- hello — 10-15",
  );
  assert.equal(response.sources.length, 1);
  assert.equal(response.sources[0].symbol, "hello");
});

test("builds symbol usage response", () => {
  const results = [
    {
      id: 1,
      score: 1,
      payload: {
        repository: "multilang",
        filePath: "UserServiceTest.java",
        symbolName: "main",
        parentName: undefined,
        language: "java",
        symbolType: "method_declaration",
        startLine: 10,
        endLine: 20,
        usageLine: 15,
        usageContent: "new UserService().getName()",
        content: "main()",
      },
    },
  ];

  const response = buildSymbolNavigationResponse(
    "Where is UserService used?",
    results,
  );

  assert.equal(response.mode, "symbol-navigation");
  assert.equal(
  response.answer,
  "The `UserService` is used in:\n- UserServiceTest.java:15 — new UserService().getName()",
);
  assert.equal(response.sources.length, 1);
  assert.equal(response.sources[0].file, "UserServiceTest.java");
});

test("builds parent-method response", () => {
  const results = [
    {
      id: 1,
      score: 1,
      payload: {
        repository: "multilang",
        filePath: "UserService.java",
        symbolName: "getName",
        parentName: "UserService",
        language: "java",
        symbolType: "method_declaration",
        startLine: 10,
        endLine: 15,
        content: "String getName() {}",
      },
    },
  ];

  const response = buildSymbolNavigationResponse(
    "Which methods belong to UserService?",
    results,
  );

  assert.equal(response.mode, "symbol-navigation");
  assert.equal(
    response.answer,
    "Methods belonging to `UserService`:\n- getName — UserService.java:10-15",
  );
});

