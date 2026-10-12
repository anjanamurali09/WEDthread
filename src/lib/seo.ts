// Small helpers for search and social tags, so every public page names its own address (canonical) and private
// pages tell search engines to stay away.
export const SITE_URL = "https://www.wedthread.co";
export const SITE_NAME = "WEDthread";
export const OG_IMAGE = `${SITE_URL}/og-image.jpg`;

// The page's own address, plus its language (the site is in English only; "x-default" is the version to show
// when no language matches).
export const canonicalLink = (path: string) => {
  const href = `${SITE_URL}${path === "/" ? "" : path}`;
  return [
    { rel: "canonical", href },
    { rel: "alternate", hrefLang: "en", href },
    { rel: "alternate", hrefLang: "x-default", href },
  ];
};

// For pages that belong to one couple or one signed-in person (their website, RSVP links, the planner, sign-in).
export const noindexMeta = [{ name: "robots", content: "noindex, nofollow" }];
