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

test("detects handle as a method when it is not request flow", () => {
  assert.equal(
    detectQueryIntent("What does the handle function do?"),
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

test("does not let class keyword override request-flow intent", () => {
  assert.equal(
    detectQueryIntent("How does the UserService class handle requests?"),
    "request-flow",
  );
});

test("does not let class keyword override method intent", () => {
  assert.equal(
    detectQueryIntent("Which method in the UserService class fetches users?"),
    "method",
  );
});

test("does not let class keyword override constructor intent", () => {
  assert.equal(
    detectQueryIntent("How is the UserService class constructed?"),
    "constructor",
  );
});
