import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createGitHubClient, buildCustomPropertyMap } from "./lib/github.mjs";
import { safeUrl } from "./lib/format.mjs";
import { renderPage } from "./lib/template.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

const org = process.env.ORG_NAME || "DCS-GH";
const repoType = process.env.REPO_TYPE || "public";
const includeForks = (process.env.INCLUDE_FORKS || "false").toLowerCase() === "true";
const title = process.env.CATALOG_TITLE || `${org} Repository Catalog`;
const generatedAt = new Date().toISOString();

const token = (
    process.env.CATALOG_GITHUB_TOKEN ||
    process.env.GH_TOKEN ||
    ""
).trim();

const { getAllPages } = createGitHubClient({ org, token });

const repos = await getAllPages(
    `/orgs/${encodeURIComponent(org)}/repos?type=${encodeURIComponent(repoType)}&sort=full_name&direction=asc`
);

let customProperties = new Map();

try {
    const rows = await getAllPages(`/orgs/${encodeURIComponent(org)}/properties/values`);
    customProperties = buildCustomPropertyMap(rows);
} catch (error) {
    console.warn("Custom properties could not be read. Continuing without owner metadata.");
    console.warn(error.message);
}

const catalog = repos
    .filter((repo) => includeForks || !repo.fork)
    .filter((repo) => repo.name !== "dcs-gh-repos.github.io")
    .map((repo) => {
        const props = customProperties.get(repo.full_name) || {};

        return {
            name: repo.name,
            full_name: repo.full_name,
            url: repo.html_url,
            description: repo.description || "",
            service_owner: props.service_owner || props.owner || "Unassigned",
            business_area: props.business_area || "",
            lifecycle: props.lifecycle || "",
            documentation_url: safeUrl(props.documentation_url || repo.homepage || ""),
            language: repo.language || "",
            visibility: repo.visibility || (repo.private ? "private" : "public"),
            archived: Boolean(repo.archived),
            fork: Boolean(repo.fork),
            pushed_at: repo.pushed_at,
            updated_at: repo.updated_at,
            topics: repo.topics || []
        };
    });

await fs.mkdir("dist", { recursive: true });

await fs.writeFile("dist/repos.json", JSON.stringify(catalog, null, 2));

await fs.copyFile(path.join(scriptDir, "styles.css"), "dist/styles.css");

const html = renderPage({ title, org, catalog, generatedAt });

await fs.writeFile("dist/index.html", html);

console.log(`Generated ${catalog.length} repositories for ${org}.`);
