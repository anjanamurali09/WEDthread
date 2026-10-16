// Picks one photo for each tile so that no two tiles show the same picture, even when the same venue (or vendor)
// is the best match for several of them. `options` is, per tile, the photo lists of every listing that fits it.
// Tiles with the fewest choices pick first. A listing's photo that has not been used is preferred, and a different
// listing is preferred over a second photo of one already shown. If every photo is taken, the first is reused.
export function pickDistinctPhotos(options: string[][][]): (string | undefined)[] {
  const used = new Set<string>();
  const usedListing = new Set<string>();
  const result: (string | undefined)[] = options.map(() => undefined);
  const order = options.map((_, i) => i).sort((a, b) => options[a].length - options[b].length);
  for (const i of order) {
    const listings = options[i].filter((p) => p.length > 0);
    // Listing identity is its first photo, which is unique to it.
    const fresh = listings.find((p) => !usedListing.has(p[0]) && p.some((u) => !used.has(u)));
    const any = fresh ?? listings.find((p) => p.some((u) => !used.has(u)));
    const listing = any ?? listings[0];
    if (!listing) continue;
    const photo = listing.find((u) => !used.has(u)) ?? listing[0];
    result[i] = photo;
    used.add(photo);
    usedListing.add(listing[0]);
  }
  return result;
}
