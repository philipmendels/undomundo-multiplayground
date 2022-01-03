import { FC, useEffect, useReducer, useRef, useState } from "react";
import { unstable_batchedUpdates } from "react-dom";
import styled from "@emotion/styled";
import { v4 } from "uuid";

import {
  initUState,
  PayloadConfigByType,
  StateUpdate,
  SyncActionUnion,
} from "undomundo";

import { State, PBT, CustomBranchData } from "./models";
import { getActionFromStateUpdate, uReducer } from "./reducer";

import { Playground } from "./components/playground";
import { initBranchData } from "./branch-data";

export const initialUState = initUState<State, PBT, CustomBranchData>(
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

const Row = styled.div`
  display: flex;
  height: 100vh;
  width: 100vw;
  background: #252526;
  padding: 20px;
`;

const last = <T,>(arr: T[]): T | undefined => arr[arr.length - 1];

interface Batch<PBT extends PayloadConfigByType> {
  id: string;
  updates: StateUpdate<PBT>[];
}

interface ServerBatch<PBT extends PayloadConfigByType> {
  batch: Batch<PBT>;
  parentId?: string;
}

const handleUpdate = (
  serverBatch: ServerBatch<PBT>,
  log: Batch<PBT>[],
  push: (actions: SyncActionUnion<PBT>[]) => void
) => {
  const convert = getActionFromStateUpdate({ isSynchronizing: true });
  const revert = getActionFromStateUpdate({
    isSynchronizing: true,
    invertAction: true,
  });
  const { batch } = serverBatch;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  if (!log.length || last(log)!.id === serverBatch.parentId) {
    log.push(batch);
    push(batch.updates.map(convert));
  } else {
    const idx = !serverBatch.parentId
      ? -1
      : log.findIndex((batch) => batch.id === serverBatch.parentId);
    if (serverBatch.parentId && idx === -1) {
      throw Error("client received update out of sync, parent is not yet here");
    }
    const toRevert = log.splice(idx + 1);
    push(
      toRevert
        .flatMap((batch) => batch.updates)
        .reverse()
        .map(revert)
    );
    log.push(batch);
    push(batch.updates.map(convert));
    log.push(...toRevert);
    push(toRevert.flatMap((batch) => batch.updates).map(convert));
  }
};

export const App: FC = () => {
  const [uState1, dispatch1] = useReducer(uReducer, initialUState);
  const [uState2, dispatch2] = useReducer(uReducer, initialUState);

  const [isSyncDragEnabled1, setIsSyncDragEnabled1] = useState(true);
  const [isSyncDragEnabled2, setIsSyncDragEnabled2] = useState(true);

  const log1 = useRef<Batch<PBT>[]>([]);
  const log2 = useRef<Batch<PBT>[]>([]);
  const serverLog = useRef<Batch<PBT>[]>([]);

  useEffect(() => {
    const updates = isSyncDragEnabled1
      ? uState1.stateUpdates.filter((update) => !update.skipState)
      : uState1.stateUpdates.filter((update) => !update.skipHistory);
    if (updates.length) {
      const batch: Batch<PBT> = {
        updates,
        id: v4(),
      };
      log1.current.push(batch);
      setTimeout(() => {
        const parentId = last(serverLog.current)?.id;
        serverLog.current.push(batch);
        const serverBatch: ServerBatch<PBT> = {
          batch,
          parentId,
        };
        setTimeout(() => {
          handleUpdate(serverBatch, log2.current, (actions) => {
            unstable_batchedUpdates(() => {
              actions.forEach(dispatch2);
            });
          });
        }, 2000);
      }, 2000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uState1.stateUpdates]);

  useEffect(() => {
    const updates = isSyncDragEnabled2
      ? uState2.stateUpdates.filter((update) => !update.skipState)
      : uState2.stateUpdates.filter((update) => !update.skipHistory);
    if (updates.length) {
      const batch: Batch<PBT> = {
        updates,
        id: v4(),
      };
      log2.current.push(batch);
      setTimeout(() => {
        const parentId = last(serverLog.current)?.id;
        serverLog.current.push(batch);
        const serverBatch: ServerBatch<PBT> = {
          batch,
          parentId,
        };
        setTimeout(() => {
          handleUpdate(serverBatch, log1.current, (actions) => {
            unstable_batchedUpdates(() => {
              actions.forEach(dispatch1);
            });
          });
        }, 2000);
      }, 2000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uState2.stateUpdates]);

  return (
    <Row>
      <Playground
        state={uState1.state}
        history={uState1.history}
        dispatch={dispatch1}
        isSyncDragEnabled={isSyncDragEnabled1}
        setIsSyncDragEnabled={setIsSyncDragEnabled1}
      />
      <Playground
        state={uState2.state}
        history={uState2.history}
        dispatch={dispatch2}
        isSyncDragEnabled={isSyncDragEnabled2}
        setIsSyncDragEnabled={setIsSyncDragEnabled2}
      />
    </Row>
  );
};
