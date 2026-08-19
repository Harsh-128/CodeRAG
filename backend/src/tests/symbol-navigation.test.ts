import test from "node:test";
import assert from "node:assert/strict";

import {
  isSymbolNavigationQuestion,
  lookupSymbolsForQuestion,
} from "../services/symbol.service.js";

test("detects 'What does ... do?' as symbol navigation", () => {
  assert.equal(
    isSymbolNavigationQuestion(
      "What does the hello function do?"
    ),
    true
  );
});

test("detects 'What does ... work?' as symbol navigation", () => {
  assert.equal(
    isSymbolNavigationQuestion(
      "What does the getName method do?"
    ),
    true
  );
});

test("extracts the correct symbol from a natural-language question", async () => {
  const results = await lookupSymbolsForQuestion(
    "What does the hello function do?",
    "multilang",
    "javascript"
  );

  assert.ok(results.length > 0);

  assert.equal(
    results[0].payload.symbolName,
    "hello"
  );

  assert.equal(
    results[0].payload.language,
    "javascript"
  );

  assert.equal(
    results[0].payload.filePath,
    "App.js"
  );
});

test("does not find nonexistent JavaScript getName", async () => {
  const results = await lookupSymbolsForQuestion(
    "What does the getName method do?",
    "multilang",
    "javascript"
  );

  assert.equal(results.length, 0);
});

test("finds TypeScript getName", async () => {
  const results = await lookupSymbolsForQuestion(
    "What does the getName method do?",
    "multilang",
    "typescript"
  );

  assert.ok(results.length > 0);

  assert.equal(
    results[0].payload.symbolName,
    "getName"
  );

  assert.equal(
    results[0].payload.language,
    "typescript"
  );

  assert.equal(
    results[0].payload.filePath,
    "UserService.ts"
  );
});

test("finds Java getName", async () => {
  const results = await lookupSymbolsForQuestion(
    "What does the getName method do?",
    "multilang",
    "java"
  );

  assert.ok(results.length > 0);

  assert.equal(
    results[0].payload.symbolName,
    "getName"
  );

  assert.equal(
    results[0].payload.language,
    "java"
  );

  assert.equal(
    results[0].payload.filePath,
    "UserService.java"
  );
});
test("finds actual getName usage but excludes its definition", async () => {
  const results = await lookupSymbolsForQuestion(
    "Where is getName called?",
    "multilang"
  );

  assert.ok(results.length > 0);

  assert.equal(
    results.some(
      (result) =>
        result.payload.symbolName === "getName" &&
        (
          result.payload.symbolType === "method_declaration" ||
          result.payload.symbolType === "method_definition"
        )
    ),
    false
  );

  assert.equal(
    results.some(
      (result) =>
        result.payload.filePath === "UserServiceTest.java"
    ),
    true
  );
});

test("finds UserService usage without returning its definitions", async () => {
  const results = await lookupSymbolsForQuestion(
    "Where is UserService used?",
    "multilang"
  );

  assert.ok(results.length > 0);

  assert.equal(
    results.some(
      (result) =>
        result.payload.symbolName === "UserService" &&
        (
          result.payload.symbolType === "class_declaration" ||
          result.payload.symbolType === "class_definition" ||
          result.payload.symbolType === "constructor_declaration"
        )
    ),
    false
  );

  assert.equal(
    results.some(
      (result) =>
        result.payload.filePath === "UserServiceTest.java"
    ),
    true
  );
});

test("finds UserService instantiation in main", async () => {
  const results = await lookupSymbolsForQuestion(
    "Where is UserService instantiated?",
    "multilang"
  );

  assert.ok(results.length > 0);

  assert.equal(
    results.some(
      (result) =>
        result.payload.filePath === "UserServiceTest.java" &&
        result.payload.symbolName === "main"
    ),
    true
  );
});
test("does not treat repository-level data flow as symbol navigation", () => {
  assert.equal(
    isSymbolNavigationQuestion(
      "How does user data flow through this repository?"
    ),
    false
  );
});
