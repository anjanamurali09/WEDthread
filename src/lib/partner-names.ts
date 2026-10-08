// The couple's names as shown anywhere in the app. If a name has not been entered it is always called
// "Partner 1" / "Partner 2", never a blank, "null", or any other placeholder.
export const PARTNER_1 = "Partner 1";
export const PARTNER_2 = "Partner 2";

type Names = { partner_a?: string | null; partner_b?: string | null } | null | undefined;

export const partnerOne = (w: Names) => w?.partner_a?.trim() || PARTNER_1;
export const partnerTwo = (w: Names) => w?.partner_b?.trim() || PARTNER_2;
export const coupleName = (w: Names) => `${partnerOne(w)} & ${partnerTwo(w)}`;
