import { createLucideIcon } from "lucide-react";

// A plain dining chair (lucide only ships an armchair, which reads as a sofa at nav size).
// Built with createLucideIcon so it takes the same className / strokeWidth props as the rest.
export const Chair = createLucideIcon("Chair", [
  ["path", { d: "M8 3h8a1 1 0 0 1 1 1v8H7V4a1 1 0 0 1 1-1z", key: "back" }],
  ["path", { d: "M6 12h12a1 1 0 0 1 1 1v2H5v-2a1 1 0 0 1 1-1z", key: "seat" }],
  ["path", { d: "M7 15v6", key: "legl" }],
  ["path", { d: "M17 15v6", key: "legr" }],
]);
