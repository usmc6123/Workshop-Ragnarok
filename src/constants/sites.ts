// Shared between App.tsx (hostname-based routing for live visitor traffic)
// and SitesView.tsx (the builder's UI) so both always agree on the same
// base domain and reserved-word list — drift between the two would mean a
// site silently either not resolving, or the main dashboard being mistaken
// for a site.
export const SITES_BASE_DOMAIN = 'homeslab.uk';

// Single-level hostnames under SITES_BASE_DOMAIN that must NEVER be treated
// as a site subdomain, because they're already something else. Sites live
// at flat one-level hostnames (e.g. cooper.homeslab.uk) rather than under a
// dedicated "sites." namespace — that would need Cloudflare's Advanced
// Certificate Manager ($10/mo) to get a valid cert for a two-level
// subdomain, which wasn't worth it for a home lab. The tradeoff: since sites
// and the main app now share the same one-level namespace, anything that's
// actually a DIFFERENT hostname pointed at this same ragnarok-backend
// container must be listed here, or a visitor to it would incorrectly see
// "site not found" instead of the real page.
// 'workshop' = this app's own primary hostname (workshop.homeslab.uk).
// Add to this set if another single-level hostname is ever pointed at
// ragnarok-backend.
export const RESERVED_SITE_SUBDOMAINS = new Set(['workshop', 'www']);
