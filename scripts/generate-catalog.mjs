import fs from "node:fs/promises";

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

const headers = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": `${org}-repo-catalog`
};

if (token) {
    headers.Authorization = `Bearer ${token}`;
}

async function github(path) {
    const response = await fetch(`https://api.github.com${path}`, { headers });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`GitHub API failed: ${response.status} ${response.statusText}\n${body}`);
    }

    return response.json();
}

async function getAllPages(path) {
    const results = [];
    let page = 1;

    while (true) {
        const joiner = path.includes("?") ? "&" : "?";
        const data = await github(`${path}${joiner}per_page=100&page=${page}`);

        if (!Array.isArray(data) || data.length === 0) {
            break;
        }

        results.push(...data);

        if (data.length < 100) {
            break;
        }

        page += 1;
    }

    return results;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

function safeUrl(value) {
    if (!value) return "";

    try {
        const url = new URL(value);
        if (url.protocol === "http:" || url.protocol === "https:") {
            return url.href;
        }
    } catch {
        return "";
    }

    return "";
}

function buildCustomPropertyMap(rows) {
    const map = new Map();

    for (const row of rows) {
        const properties = {};

        for (const property of row.properties || []) {
            properties[property.property_name] = property.value;
        }

        map.set(row.repository_full_name, properties);
    }

    return map;
}

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

const repoRows = catalog.map((repo) => {
    const repoUrl = safeUrl(repo.url);
    const docsUrl = safeUrl(repo.documentation_url);
    const pushedDate = repo.pushed_at ? new Date(repo.pushed_at).toISOString().slice(0, 10) : "";

    const badges = [
        repo.visibility,
        repo.archived ? "archived" : "",
        repo.lifecycle
    ].filter(Boolean);

    return `
    <tr>
      <td>
        <a href="${escapeHtml(repoUrl)}">${escapeHtml(repo.name)}</a>
        <div class="muted">${escapeHtml(repo.full_name)}</div>
      </td>
      <td>${escapeHtml(repo.description || "No description")}</td>
      <td>${escapeHtml(repo.service_owner)}</td>
      <td>${escapeHtml(repo.language || "-")}</td>
      <td>
        ${badges.map((badge) => `<span class="badge">${escapeHtml(badge)}</span>`).join(" ")}
      </td>
      <td>${docsUrl ? `<a href="${escapeHtml(docsUrl)}">Docs</a>` : "-"}</td>
      <td>${escapeHtml(pushedDate)}</td>
    </tr>
  `;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
  :root {
    --magenta: #e20074;
    --magenta-dark: #b0005a;
    --black: #000000;
    --white: #ffffff;
    --gray-50: #f6f6f6;
    --gray-100: #eeeeee;
    --gray-200: #d9d9d9;
    --gray-500: #737373;
    --gray-800: #262626;
    --radius: 0.25rem;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    font-family: "Inter", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    background: var(--gray-50);
    color: var(--black);
  }

  body::before {
    content: "";
    display: block;
    height: 0.5rem;
    background: var(--magenta);
  }

  main {
    max-width: 1240px;
    margin: 0 auto;
    padding: 2.5rem 2rem 4rem;
  }

  header {
    background: var(--white);
    border-left: 0.5rem solid var(--magenta);
    box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.08);
    padding: 2rem;
    margin-bottom: 2rem;
  }

  h1 {
    margin: 0;
    color: var(--black);
    font-size: clamp(2rem, 4vw, 3.25rem);
    line-height: 1;
    letter-spacing: -0.04em;
    font-weight: 800;
  }

  h1::after {
    content: "";
    display: block;
    width: 4rem;
    height: 0.35rem;
    background: var(--magenta);
    margin-top: 1rem;
  }

  a {
    color: var(--magenta);
    text-decoration: none;
    font-weight: 650;
  }

  a:hover {
    color: var(--magenta-dark);
    text-decoration: underline;
  }

  input {
    width: 100%;
    max-width: 44rem;
    margin-top: 1.5rem;
    padding: 0.95rem 1rem;
    border: 2px solid var(--black);
    border-radius: var(--radius);
    background: var(--white);
    color: var(--black);
    font-size: 1rem;
    outline: none;
  }

  input:focus {
    border-color: var(--magenta);
    box-shadow: 0 0 0 0.2rem rgba(226, 0, 116, 0.18);
  }

  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    background: var(--white);
    box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.08);
    overflow: hidden;
  }

  th,
  td {
    padding: 1rem;
    border-bottom: 1px solid var(--gray-200);
    text-align: left;
    vertical-align: top;
  }

  th {
    background: var(--black);
    color: var(--white);
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 750;
  }

  th:first-child {
    border-left: 0.35rem solid var(--magenta);
  }

  tbody tr:hover {
    background: #fff5fa;
  }

  tr:last-child td {
    border-bottom: 0;
  }

  td:first-child a {
    font-size: 1.05rem;
  }

  .muted {
    color: var(--gray-500);
    font-size: 0.9rem;
    margin-top: 0.25rem;
  }

  .badge {
    display: inline-block;
    margin: 0 0.25rem 0.25rem 0;
    padding: 0.25rem 0.55rem;
    border: 1px solid var(--gray-200);
    border-radius: 999px;
    font-size: 0.78rem;
    font-weight: 650;
    color: var(--gray-800);
    background: var(--gray-100);
  }

  .badge:first-child {
    border-color: var(--magenta);
    color: var(--magenta);
    background: #fff0f7;
  }

  footer {
    margin-top: 1.5rem;
    color: var(--gray-500);
    font-size: 0.9rem;
  }

  @media (max-width: 900px) {
    main {
      padding: 1.5rem 1rem 3rem;
    }

    header {
      padding: 1.5rem;
    }

    table {
      display: block;
      overflow-x: auto;
      white-space: nowrap;
    }
  }
</style>
</head>
<body>
  <main>
    <header>
      <h1>${escapeHtml(title)}</h1>
      <p class="muted">
        ${catalog.length} repositories generated from ${escapeHtml(org)}.
        Last generated: ${escapeHtml(generatedAt)}.
      </p>
      <input id="search" type="search" placeholder="Search repository, description, owner, language, status...">
    </header>

    <table id="repo-table">
      <thead>
        <tr>
          <th>Repository</th>
          <th>Description</th>
          <th>Owner</th>
          <th>Language</th>
          <th>Status</th>
          <th>Docs</th>
          <th>Last pushed</th>
        </tr>
      </thead>
      <tbody>
        ${repoRows}
      </tbody>
    </table>

    <footer>
      Generated automatically by GitHub Actions.
    </footer>
  </main>

  <script>
    const search = document.getElementById("search");
    const rows = Array.from(document.querySelectorAll("#repo-table tbody tr"));

    search.addEventListener("input", () => {
      const query = search.value.trim().toLowerCase();

      for (const row of rows) {
        row.style.display = row.textContent.toLowerCase().includes(query) ? "" : "none";
      }
    });
  </script>
</body>
</html>`;

await fs.writeFile("dist/index.html", html);

console.log(`Generated ${catalog.length} repositories for ${org}.`);