import test from "node:test";
import assert from "node:assert/strict";

import {
  getRepositoryInventoryQuestionType,
} from "../services/symbol.service.js";

test("classifies files inside a directory as directory contents", () => {
  assert.equal(
    getRepositoryInventoryQuestionType("What files are inside src?"),
    "directory_contents",
  );
});

test("classifies symbols inside a directory as symbols", () => {
  assert.equal(
    getRepositoryInventoryQuestionType("What symbols are inside src?"),
    "symbols",
  );
});

test("classifies functions inside a directory as symbols", () => {
  assert.equal(
    getRepositoryInventoryQuestionType("What functions are inside src?"),
    "symbols",
  );
});

test("classifies classes inside a directory as symbols", () => {
  assert.equal(
    getRepositoryInventoryQuestionType("What classes are inside src?"),
    "symbols",
  );
});
