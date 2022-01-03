import * as React from "react";
import { Fragment } from "react";
import styled from "@emotion/styled";
import { Checkbox, FormControlLabel, Typography } from "@mui/material";
import { AnimateSharedLayout } from "framer-motion";
import { vAdd, vMag, vScale, vSub } from "vec-la-fp";

import {
  timeTravel,
  History,
  HistoryItemUnion,
  MetaAction,
  PayloadConfigByType,
  getCurrentBranch,
} from "undomundo";

import { TimelineItem } from "./timeline-item";
import { TimelineConnection } from "./timeline-connection";
import { getGlobalIndex, getSortedBranches } from "../helpers";
import { CustomBranchData } from "../models";

const Root = styled.div`
  position: relative;
  margin: 15px 5px;
`;

type Props<PBT extends PayloadConfigByType> = {
  history: History<PBT, CustomBranchData>;
  dispatch: React.Dispatch<MetaAction>;
  renderValue: (
    action: HistoryItemUnion<PBT>,
    direction: "undo" | "redo"
  ) => React.ReactChild;
};

export const TimeLine = <PBT extends PayloadConfigByType>({
  history,
  dispatch,
  renderValue,
}: React.PropsWithChildren<Props<PBT>>): React.ReactElement | null => {
  const [fixedOrder, setFixedOred] = React.useState(true);

  const currentBranch = getCurrentBranch(history);

  const branches = getSortedBranches(history, fixedOrder);

  const branchesPerIndex: number[] = [];

  const positions = branches.map((branch, branchIndex) =>
    branch.stack.map((item, indexOnBranch) => {
      const globalIndex = getGlobalIndex(branch, indexOnBranch);
      const bpi = branchesPerIndex[globalIndex] || 0;
      const itemPosition: [number, number] = [bpi * 30, (globalIndex + 1) * 30];
      branchesPerIndex[globalIndex] = bpi + 1;
      return itemPosition;
    })
  );

  // TODO: refactor to have a clean render function
  let prevItemPositionBup: [number, number] = [0, 0];
  return (
    <>
      <FormControlLabel
        control={
          <Checkbox
            color="primary"
            checked={fixedOrder}
            onChange={(_, checked) => setFixedOred(checked)}
          />
        }
        label={<Typography variant="body2">Fix branch order</Typography>}
      />
      <Root>
        {currentBranch.stack.length > 0 && (
          <TimelineItem
            color={currentBranch.custom.color}
            id="start"
            itemPosition={[0, 0]}
            previewValue={renderValue(currentBranch.stack[0], "undo")}
            isActivePast={true}
            isActive={history.currentIndex === -1}
            onClick={() => dispatch(timeTravel(-1))}
          />
        )}
        <AnimateSharedLayout>
          {branches.map((branch, branchIndex) =>
            branch.stack.map((item, indexOnBranch) => {
              const globalIndex = getGlobalIndex(branch, indexOnBranch);
              const itemPosition = positions[branchIndex][indexOnBranch];

              let prevItemPosition: [number, number];
              if (indexOnBranch === 0) {
                if (
                  branch.parentConnection === undefined ||
                  branch.parentConnection.globalIndex === -1
                ) {
                  prevItemPosition = [0, 0];
                } else {
                  const parentIndex = branches.findIndex(
                    (b) => b.id === branch.parentConnection!.branchId
                  );
                  const parent = branches[parentIndex];
                  prevItemPosition =
                    positions[parentIndex][
                      branch.parentConnection.globalIndex -
                        (parent.parentConnection?.globalIndex === undefined
                          ? -1
                          : parent.parentConnection?.globalIndex) -
                        1
                    ];
                  if (!prevItemPosition) {
                    prevItemPosition = [
                      itemPosition[0],
                      (branch.parentConnection.globalIndex + 1) * 30,
                    ];
                  }
                }
              } else {
                prevItemPosition = prevItemPositionBup;
              }
              const diff = vSub(itemPosition, prevItemPosition);
              prevItemPositionBup = itemPosition;

              const connectionLength = diff ? vMag(diff) : 30;

              const connectionPosition = prevItemPosition
                ? vScale(0.5, vAdd(itemPosition, prevItemPosition))
                : [branchIndex * 30, (globalIndex + 1) * 30 - 15];

              const angle = diff
                ? Math.atan2(diff[1], diff[0]) - 0.5 * Math.PI
                : 0;

              const isCurrentBranch = branch.id === history.currentBranchId;

              const isActive =
                globalIndex === history.currentIndex && isCurrentBranch;

              const isActivePast =
                globalIndex < history.currentIndex && isCurrentBranch;

              const [cx, cy] = connectionPosition;

              const isPast =
                isCurrentBranch && globalIndex < history.currentIndex;

              const previewItem = isPast
                ? branch.stack[indexOnBranch + 1]
                : item;

              return (
                <Fragment key={item.id}>
                  <TimelineConnection
                    length={connectionLength}
                    angle={angle}
                    position={[cx, cy]}
                  />
                  <TimelineItem
                    color={branch.custom.color}
                    isActive={isActive}
                    isActivePast={isActivePast}
                    id={item.id}
                    previewValue={renderValue(
                      previewItem,
                      isPast ? "undo" : "redo"
                    )}
                    itemPosition={itemPosition}
                    onClick={() =>
                      dispatch(timeTravel(indexOnBranch, branch.id))
                    }
                  />
                </Fragment>
              );
            })
          )}
        </AnimateSharedLayout>
      </Root>
    </>
  );
};
