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

    return { github, getAllPages };
}

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
