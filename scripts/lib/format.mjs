// Escape user/API-supplied values before interpolating them into HTML to prevent injection.
// Ampersand is replaced first so the entities emitted below aren't themselves re-escaped.
export function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

// Allow a URL only if it parses and uses http/https; anything else (e.g. a javascript:
// scheme) or unparseable input returns "" so it can never become a link target.
export function safeUrl(value) {
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
