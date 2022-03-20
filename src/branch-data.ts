import { InitBranchData } from "undomundo";

import { CustomBranchData, PBT } from "./models";

const colors = [
  "#CE9178",
  "#4DB29D",
  "#569CD6",
  "#A974A4",
  "#DADAA9",
  "#4EBEFA",
];

export const initBranchData: InitBranchData<PBT, CustomBranchData> = (
  history
) => {
  const usedColors = Object.values(history.branches).map((b) => b.custom.color);
  return {
    name: `branch ${history.stats.branchCounter + 1}`,
    color: colors.find((c) => !usedColors.includes(c)) || colors[0],
  };
};
