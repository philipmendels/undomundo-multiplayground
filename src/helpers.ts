import {
  Branch,
  CustomData,
  getCurrentBranch,
  History,
  PayloadConfigByType,
} from "undomundo";
import { CustomBranchData } from "./models";

export const getGlobalIndex = (
  branch: Branch<any, any>,
  indexOnBranch: number
) => (branch.parentConnection?.globalIndex ?? -1) + 1 + indexOnBranch;

const getParentBranches = <
  PBT extends PayloadConfigByType,
  CBT extends CustomData
>(
  history: History<PBT, CBT>,
  branch: Branch<PBT, CBT>,
  prop: "parentConnection" | "parentConnectionInitial"
) => {
  let globalIndex = Infinity;
  let created = branch.created;
  let b = branch;
  const list: Branch<PBT, CBT>[] = [];
  while (b && b[prop]) {
    const parent = history.branches[b[prop]!.branchId];
    const gi = b[prop]!.globalIndex;
    if (gi < globalIndex) {
      globalIndex = gi;
      created = b.created;
    }
    list.push({
      ...b,
      created,
      [prop]: {
        ...b[prop],
        globalIndex,
      },
    });
    b = parent;
  }
  return list;
};

export const getSortedBranches = <PBT extends PayloadConfigByType>(
  history: History<PBT, CustomBranchData>,
  fixedOrder = true
): Branch<PBT, CustomBranchData>[] => {
  let initialBranch: Branch<PBT, CustomBranchData>;
  let otherBranches: Branch<PBT, CustomBranchData>[];

  if (fixedOrder) {
    const sortedBranches = Object.values(history.branches).sort(
      (a, b) => new Date(a.created).getTime() - new Date(a.created).getTime()
    );
    [initialBranch, ...otherBranches] = sortedBranches;
  } else {
    initialBranch = getCurrentBranch(history);
    otherBranches = Object.values(history.branches).filter(
      (b) => b !== initialBranch
    );
  }

  const prop: keyof Branch<PBT, CustomBranchData> = fixedOrder
    ? "parentConnectionInitial"
    : "parentConnection";

  // console.log("--------");
  return [
    initialBranch,
    ...otherBranches.sort((b1, b2) => {
      const list1 = getParentBranches(history, b1, prop);
      const list2 = getParentBranches(history, b2, prop);

      // console.log(b1.custom.color, list1, b2.custom.color, list2);

      if (list1.find((b) => b[prop]?.branchId === b2.id)) {
        // console.log("A");
        return 1;
      } else if (list2.find((b) => b[prop]?.branchId === b1.id)) {
        // console.log("B");
        return -1;
      } else {
        // branchBeforeNearestCommonAncestor1
        const branchBNCA1 = list1.find((b) =>
          list2.find((b2) => b[prop]?.branchId === b2[prop]?.branchId)
        )!;
        const pc1 = branchBNCA1[prop]!;

        const branchBNCA2 = list2.find(
          (b) => b[prop]?.branchId === pc1.branchId
        )!;
        const pc2 = branchBNCA2[prop]!;

        if (pc1.globalIndex === pc2.globalIndex) {
          // console.log("same index");
          return (
            new Date(branchBNCA1.created).getTime() -
            new Date(branchBNCA2.created).getTime()
          );
        } else {
          // console.log("different index", pc1, pc2);
          return pc2.globalIndex - pc1.globalIndex;
        }
      }
    }),
  ];
};
