import simpleGit from "simple-git";
import path from "path";
import fs from "fs/promises";

const REPOSITORIES_DIR = path.join(process.cwd(), "repositories");

export const cloneRepository = async (
  repositoryUrl: string,
  repositoryName: string
): Promise<string> => {
  await fs.mkdir(REPOSITORIES_DIR, { recursive: true });

  const repositoryPath = path.join(
    REPOSITORIES_DIR,
    repositoryName
  );

  const git = simpleGit();

  await git.clone(repositoryUrl, repositoryPath);

  return repositoryPath;
};