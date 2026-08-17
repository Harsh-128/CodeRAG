import {
  parseCode,
} from "./services/code-parser.service.js";

const examples = [
  {
    language: "javascript" as const,

    code: `
function hello(name) {
  return name;
}

class UserService {
  getUser() {
    return {};
  }
}
`,
  },

  {
    language: "python" as const,

    code: `
def hello(name):
    return name

class UserService:
    def get_user(self):
        return {}
`,
  },

  {
    language: "go" as const,

    code: `
package main

func hello(name string) string {
    return name
}

type UserService struct {}

func (u UserService) GetUser() {
}
`,
  },

  {
    language: "java" as const,

    code: `
public class UserService {

    private String name;

    public UserService(String name) {
        this.name = name;
    }

    public String getName() {
        return name;
    }

    public void greet() {
        System.out.println("Hello " + name);
    }
}
`,
  },
];

for (const example of examples) {
  console.log(
    `\n===== ${example.language.toUpperCase()} =====`
  );

  const nodes = parseCode(
    example.code,
    example.language
  );

  for (const node of nodes) {
    console.log({
  type: node.type,
  name: node.name,
  parentName: node.parentName,
  startLine: node.startLine,
  endLine: node.endLine,
});
  }
}
