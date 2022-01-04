import { useReducer, useState, useRef } from "react";
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const useClient = (id: string) => {
  const [uState, dispatch] = useReducer(uReducer, getInitialUState());

  const [isSyncDragEnabled, setIsSyncDragEnabled] = useState(true);
  const [isDelayed, setIsDelayed] = useState(false);
  const [syncUpTime, setSyncUpTime] = useState(2);
  const [syncDownTime, setSyncDownTime] = useState(2);

  const log = useRef<Batch<PBT>[]>([]);

  const handleActions = (actions: SyncActionUnion<PBT>[]) => {
    unstable_batchedUpdates(() => {
      actions.forEach(dispatch);
    });
  };

  const handleUpdate = (serverBatch: ServerBatch<PBT>) => {
    const convert = getActionFromStateUpdate({ isSynchronizing: true });
    const revert = getActionFromStateUpdate({
      isSynchronizing: true,
      invertAction: true,
    });
    const { batch } = serverBatch;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    if (!log.current.length || last(log.current)!.id === serverBatch.parentId) {
      log.current.push(batch);
      handleActions(batch.updates.map(convert));
    } else {
      const idx = !serverBatch.parentId
        ? -1
        : log.current.findIndex((batch) => batch.id === serverBatch.parentId);
      if (serverBatch.parentId && idx === -1) {
        throw Error(
          "client received update out of sync, parent is not yet here"
        );
      }
      const toRevert = log.current.splice(idx + 1);
      handleActions(
        toRevert
          .flatMap((batch) => batch.updates)
          .reverse()
          .map(revert)
      );
      log.current.push(batch);
      handleActions(batch.updates.map(convert));
      log.current.push(...toRevert);
      handleActions(toRevert.flatMap((batch) => batch.updates).map(convert));
    }
  };

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
  };
};

export type Client = ReturnType<typeof useClient>;
