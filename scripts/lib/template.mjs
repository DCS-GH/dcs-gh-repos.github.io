import { escapeHtml, safeUrl } from "./format.mjs";

// Render a single repository as a table row. Every interpolated value is escaped, and
// links are passed through safeUrl so untrusted metadata can't inject markup or bad schemes.
function renderRow(repo) {
    const repoUrl = safeUrl(repo.url);
    const docsUrl = safeUrl(repo.documentation_url);
    // Show just the date portion (YYYY-MM-DD) of the ISO timestamp; blank if never pushed.
    const pushedDate = repo.pushed_at ? new Date(repo.pushed_at).toISOString().slice(0, 10) : "";

    // Collect status badges, dropping empty/false entries so only meaningful ones render.
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
}

// Assemble the full static HTML page from the catalog data.
export function renderPage({ title, org, catalog, generatedAt }) {
    const repoRows = catalog.map(renderRow).join("");

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="styles.css">
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
    // Client-side filter: hide any row whose visible text doesn't contain the query.
    // Rows are cached once up front since the table is static after generation.
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
}
