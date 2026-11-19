// Photos that really show each kind of space, checked by eye. The "Explore venues by style" tiles and the quiz
// cards only use a photo from this list, because a venue tagged Indoor or Beach also has photos of its garden,
// guests and bedrooms, and any of those would otherwise end up under the wrong label. Each entry is the part of
// the photo's address after /business-media/. A style with no photo here gets no tile (Poolside and Farmhouse
// have none yet). To show a new venue's photo, check that it clearly shows the style and add it below.
const VERIFIED: Record<string, string[]> = {
  "Indoor": [
    "158be27f-908d-452d-aa67-946f6fc71b18/1789365901133-arabic-theroyalbridgesuite-mainroom-scaled.jpg", // Atlantis The P #0
    "158be27f-908d-452d-aa67-946f6fc71b18/1789365916577-Weddings-Lifestyle-ArabicCoupleAyamna-jpg.jpeg", // Atlantis The P #1
    "509d76aa-5825-4c48-88c2-de1858b45d1c/1789627458899-FourSeasons_4_wedthread.jpg", // Four Seasons R #4
    "509d76aa-5825-4c48-88c2-de1858b45d1c/1789627491089-FourSeasons_4_wedthread.jpg", // Four Seasons R #6
    "009dba64-994a-42e5-a127-e73666421ce1/1789627597685-ButleyPriory_5_wedthread.jpg", // Butley Priory #6
    "33922474-c02a-4e64-89a0-49b441201e2e/1789625120147-Hanbury_6_wedthread.jpg", // Hanbury Manor #4
  ],
  "Outdoor": [
    "509d76aa-5825-4c48-88c2-de1858b45d1c/1789627447109-DJB_2198_original.jpg", // Four Seasons R #0
    "509d76aa-5825-4c48-88c2-de1858b45d1c/1789627452072-FourSeasons_2_wedthread.jpg", // Four Seasons R #2
    "509d76aa-5825-4c48-88c2-de1858b45d1c/1789627456676-FourSeasons_3wedthread.jpg", // Four Seasons R #3
    "158be27f-908d-452d-aa67-946f6fc71b18/1789365908848-ATR-Weddings-Couple.jpeg", // Atlantis The P #5
    "f81451bd-3911-4d82-ba3f-6d51595984c9/1789627296959-One&Only_1_wedthread.webp", // OneandOnly #0
    "009dba64-994a-42e5-a127-e73666421ce1/1789627602110-ButleyPriory_7_wedthread.jpg", // Butley Priory #0
    "33922474-c02a-4e64-89a0-49b441201e2e/1789625122145-Hanbury_7_wedthread.jpg", // Hanbury Manor #5
    "1f5bd0a8-d599-4f80-a525-fe53cd103ed4/1789391880754-camley-street-natural-park-wedding-venue-london-hajley-photography-1.jpg", // Camley Street  #4
  ],
  "Beach": [
    "158be27f-908d-452d-aa67-946f6fc71b18/1789365912832-PHY2021-EVE-WED-BEACH-1_LR-jpg.jpeg", // Atlantis The P #3
  ],
  "Rooftop": [
    "03b4a3c8-ce8a-40f8-995e-3324a0c4496d/1789479400554-ninive_wedthread.jpeg", // Ninive Beach #0
    "03b4a3c8-ce8a-40f8-995e-3324a0c4496d/1789479532865-1762934308303_NNV_BCH_ROOFTOP1.jpeg", // Ninive Beach #3
    "03b4a3c8-ce8a-40f8-995e-3324a0c4496d/1789479534677-1762934316345_NNV_Beach_outside.jpeg", // Ninive Beach #4
  ],
  "Banquet hall": [
    "509d76aa-5825-4c48-88c2-de1858b45d1c/1789627458899-FourSeasons_4_wedthread.jpg", // Four Seasons R #4
    "509d76aa-5825-4c48-88c2-de1858b45d1c/1789627491089-FourSeasons_4_wedthread.jpg", // Four Seasons R #6
    "33922474-c02a-4e64-89a0-49b441201e2e/1789625120147-Hanbury_6_wedthread.jpg", // Hanbury Manor #4
  ],
};

/** True when this photo address is one of the checked photos for the given kind of space. */
export function isVerifiedStylePhoto(style: string, url: string): boolean {
  const key = url.split("/business-media/")[1];
  return !!key && (VERIFIED[style] ?? []).includes(key);
}
