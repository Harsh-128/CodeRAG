import {
  detectLanguage,
} from "./services/language-detection.service.js";

const files = [
  "src/app.js",
  "src/component.jsx",
  "src/server.ts",
  "src/component.tsx",
  "src/main.py",
  "cmd/server.go",
  "src/UserService.java",
  "README.md",
];

for (const file of files) {
  console.log(
    `${file} → ${detectLanguage(file)}`
  );
}
