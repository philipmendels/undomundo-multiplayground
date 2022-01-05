import { useReducer, useState, useRef, useCallback } from "react";
import { unstable_batchedUpdates } from "react-dom";

import { initUState, SyncActionUnion } from "undomundo";
import { initBranchData } from "./branch-data";

import { Batch, CustomBranchData, PBT, ServerBatch, State } from "./models";
import { uReducer, getActionFromStateUpdate } from "./reducer";
import { last } from "./util";

const getInitialUState = () =>
  initUState<State, PBT, CustomBranchData>(
    {
      blocks: {
        a: {
          id: "a",
          position: [3, 3],
          shape: "circle",
        },
        b: {
          id: "b",
          position: [6, 8],
          shape: "square",
        },
      },
    },
    initBranchData()
  );

export const useClient = (id: string) => {
  const [uState, dispatch] = useReducer(uReducer, getInitialUState());

  const [isSyncDragEnabled, setIsSyncDragEnabled] = useState(true);
  const [isDelayed, setIsDelayed] = useState(false);
  const [syncUpTime, setSyncUpTime] = useState(2);
  const [syncDownTime, setSyncDownTime] = useState(2);

  const log = useRef<Batch<PBT>[]>([]);

  const handleActions = (actions: SyncActionUnion<PBT>[]) => {
    actions.forEach(dispatch);
  };

  const handleUpdate = useCallback(
    (serverBatch: ServerBatch<PBT>) => {
      // console.log(
      //   "handle update",
      //   id,
      //   serverBatch.batch.id,
      //   serverBatch.parentId,
      //   log.current.map((batch) => batch.id.slice(0, 4)).join(", ")
      // );
      const convert = getActionFromStateUpdate({ isSynchronizing: true });
      const revert = getActionFromStateUpdate({
        isSynchronizing: true,
        invertAction: true,
      });
      const { batch } = serverBatch;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      if (
        !log.current.length ||
        last(log.current)!.id === serverBatch.parentId
      ) {
        log.current = [batch];
        unstable_batchedUpdates(() => {
          handleActions(batch.updates.map(convert));
        });
      } else {
        const idx = !serverBatch.parentId
          ? -1
          : log.current.findIndex((batch) => batch.id === serverBatch.parentId);

        if (serverBatch.parentId && idx === -1) {
          throw Error(
            `Client ${id} received update ${
              batch.id
            } out of sync. Parent update ${
              serverBatch.parentId
            } is not found. Current log is: ${log.current
              .map((batch) => batch.id.slice(0, 4))
              .join(", ")}.`
          );
        }

        const toRevert = log.current.slice(idx + 1);
        log.current = [batch, ...toRevert];

        unstable_batchedUpdates(() => {
          handleActions(
            toRevert
              .flatMap((batch) => batch.updates)
              .reverse()
              .map(revert)
          );
          handleActions(batch.updates.map(convert));
          handleActions(
            toRevert.flatMap((batch) => batch.updates).map(convert)
          );
        });
      }
    },
    [id]
  );

  return {
    uState,
    dispatch,
    isSyncDragEnabled,
    setIsSyncDragEnabled,
    syncUpTime,
    setSyncUpTime,
    syncDownTime,
    setSyncDownTime,
    log,
    handleUpdate,
    isDelayed,
    setIsDelayed,
    id,
  };
};

export type Client = ReturnType<typeof useClient>;
