import { History, PayloadConfigByType } from "undomundo";

import { CustomBranchData } from "./models";

const colors = [
  "#CE9178",
  "#4DB29D",
  "#569CD6",
  "#A974A4",
  "#DADAA9",
  "#4EBEFA",
];

export const initBranchData = <PBT extends PayloadConfigByType>(
  history?: History<PBT, CustomBranchData>
): CustomBranchData => {
  const usedColors = Object.values(history?.branches || {}).map(
    (b) => b.custom.color
  );
  return {
    name: `branch ${(history?.stats.branchCounter || 0) + 1}`,
    color: colors.find((c) => !usedColors.includes(c)) || "light-gray",
  };
};
