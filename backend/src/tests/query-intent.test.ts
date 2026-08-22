import test from "node:test";
import assert from "node:assert/strict";
import { detectQueryIntent } from "../services/query-intent.service.js";

test("detects request-flow questions", () => {
  assert.equal(
    detectQueryIntent("How does Express handle a request?"),
    "request-flow",
  );
});

test("detects repository questions", () => {
  assert.equal(
    detectQueryIntent("Show me the repository structure"),
    "repository-inventory",
  );
});

test("detects method questions", () => {
  assert.equal(
    detectQueryIntent("Which method fetches the user?"),
    "method",
  );
});

test("detects constructor questions", () => {
  assert.equal(
    detectQueryIntent("Where is UserService instantiated?"),
    "constructor",
  );
});

test("detects declaration questions", () => {
  assert.equal(
    detectQueryIntent("Where is the UserService class defined?"),
    "declaration",
  );
});

test("falls back to general", () => {
  assert.equal(
    detectQueryIntent("Explain the authentication feature"),
    "general",
  );
});
