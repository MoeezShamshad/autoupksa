type GitHubConfig = {
  owner: string;
  repository: string;
  branch: string;
  token: string;
};

export type RepositoryFile = {
  path: string;
  content: string;
  encoding?: "base64";
  delete?: boolean;
};

export class GitHubRepositoryError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "GitHubRepositoryError";
  }
}

function getConfig(): GitHubConfig | null {
  const repository = process.env["GITHUB_REPOSITORY"]?.trim();
  const token = process.env["GITHUB_TOKEN"]?.trim();
  const branch = process.env["GITHUB_BRANCH"]?.trim() || "main";

  if (!repository && !token) return null;
  if (!repository || !token) {
    throw new Error("Set both GITHUB_REPOSITORY and GITHUB_TOKEN to enable repository publishing.");
  }

  const [owner, name, extra] = repository.split("/");
  if (!owner || !name || extra) {
    throw new Error("GITHUB_REPOSITORY must use the owner/repository format.");
  }

  return { owner, repository: name, branch, token };
}

async function requestGitHub<T>(
  config: GitHubConfig,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`https://api.github.com/repos/${config.owner}/${config.repository}${path}`, {
    ...init,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${config.token}`,
      "x-github-api-version": "2022-11-28",
      "user-agent": "AutoUp-Website-CMS",
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new GitHubRepositoryError(
      `GitHub repository request failed (${response.status}): ${detail.slice(0, 300)}`,
      response.status,
    );
  }
  return (await response.json()) as T;
}

export function isRepositoryConfigured() {
  return getConfig() !== null;
}

export async function readRepositoryJson<T>(path: string): Promise<T | null> {
  const config = getConfig();
  if (!config) return null;

  try {
    const file = await requestGitHub<{ content: string; encoding: string }>(
      config,
      `/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(config.branch)}`,
    );
    if (file.encoding !== "base64") {
      throw new Error(`GitHub returned an unsupported encoding for ${path}.`);
    }
    return JSON.parse(Buffer.from(file.content, "base64").toString("utf8")) as T;
  } catch (error) {
    if (error instanceof GitHubRepositoryError && error.status === 404) return null;
    throw error;
  }
}

export async function publishRepositoryFiles(files: RepositoryFile[], message: string) {
  const config = getConfig();
  if (!config) {
    throw new Error("Repository publishing is not configured. Set GITHUB_REPOSITORY and GITHUB_TOKEN.");
  }
  if (!files.length) throw new Error("No repository files were provided for publishing.");

  const ref = await requestGitHub<{ object: { sha: string } }>(
    config,
    `/git/ref/heads/${config.branch.split("/").map(encodeURIComponent).join("/")}`,
  );
  const parentSha = ref.object.sha;
  const parent = await requestGitHub<{ tree: { sha: string } }>(
    config,
    `/git/commits/${parentSha}`,
  );

  const tree = await Promise.all(
    files.map(async (file) => {
      if (file.delete) {
        return { path: file.path, mode: "100644", type: "blob", sha: null };
      }

      const blob = await requestGitHub<{ sha: string }>(config, "/git/blobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: file.content, encoding: file.encoding ?? "utf-8" }),
      });
      return { path: file.path, mode: "100644", type: "blob", sha: blob.sha };
    }),
  );
  const createdTree = await requestGitHub<{ sha: string }>(config, "/git/trees", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ base_tree: parent.tree.sha, tree }),
  });
  const commit = await requestGitHub<{ sha: string }>(config, "/git/commits", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message, tree: createdTree.sha, parents: [parentSha] }),
  });

  try {
    await requestGitHub(config, `/git/refs/heads/${config.branch.split("/").map(encodeURIComponent).join("/")}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sha: commit.sha, force: false }),
    });
  } catch (error) {
    if (error instanceof GitHubRepositoryError && (error.status === 409 || error.status === 422)) {
      throw new GitHubRepositoryError(
        "The repository changed while you were editing. Reload the latest content and try again.",
        409,
      );
    }
    throw error;
  }

  return { commit: commit.sha };
}
