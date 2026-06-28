// Build a minimal GitHub REST client bound to a fixed set of headers.
// A token is optional: unauthenticated calls still work but hit a much lower rate limit
// and cannot read org-level data such as custom properties.
export function createGitHubClient({ org, token }) {
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

    // Walk GitHub's paginated list endpoints, requesting the max 100 items per page.
    // The joiner preserves any existing query string on `path` before appending paging params.
    async function getAllPages(path) {
        const results = [];
        let page = 1;

        while (true) {
            const joiner = path.includes("?") ? "&" : "?";
            const data = await github(`${path}${joiner}per_page=100&page=${page}`);

            // Stop on a non-array/empty response (end of data or an unexpected payload).
            if (!Array.isArray(data) || data.length === 0) {
                break;
            }

            results.push(...data);

            // A short page means this was the last one, so avoid an extra empty request.
            if (data.length < 100) {
                break;
            }

            page += 1;
        }

        return results;
    }

    return { github, getAllPages };
}

// Flatten the org custom-properties response (an array of name/value pairs per repo)
// into a Map keyed by repository full name for O(1) lookup while building the catalog.
export function buildCustomPropertyMap(rows) {
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
