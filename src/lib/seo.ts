// Small helpers for search and social tags, so every public page names its own address (canonical) and private
// pages tell search engines to stay away.
export const SITE_URL = "https://www.wedthread.co";
export const SITE_NAME = "WEDthread";
export const OG_IMAGE = `${SITE_URL}/og-image.jpg`;

export const canonicalLink = (path: string) => [{ rel: "canonical", href: `${SITE_URL}${path === "/" ? "" : path}` }];

// For pages that belong to one couple or one signed-in person (their website, RSVP links, the planner, sign-in).
export const noindexMeta = [{ name: "robots", content: "noindex, nofollow" }];
