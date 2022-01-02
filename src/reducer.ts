import { invert } from "fp-ts-std/Boolean";
import { merge } from "fp-ts-std/Record";
import { flow } from "fp-ts/function";
import { filter, map, mapWithIndex } from "fp-ts/Record";
import { vAdd, vScale } from "vec-la-fp";

import { makeUndoableReducer } from "undomundo";

import { State, PBT, CustomBranchData } from "./models";
import { initBranchData } from "./branch-data";
import {
  evolve,
  isIdInSelection,
  mapPayloadToProp,
  updateSelected,
} from "./util";

export const { uReducer, actionCreators, getActionFromStateUpdate } =
  makeUndoableReducer<State, PBT, CustomBranchData>({
    actionConfigs: {
      add: {
        updateHistory: (state) =>
          mapWithIndex((id) => state.blocks[id] ?? null),
        updateState: (payload) =>
          evolve({
            blocks: merge(filter((item) => item !== null)(payload)),
          }),
        makeActionForUndo: ({ payload }) => ({ type: "remove", payload }),
      },
      remove: {
        updateHistory: (state) =>
          mapWithIndex((id) => state.blocks[id] ?? null),
        updateState: (payload) =>
          evolve({ blocks: filter(flow(isIdInSelection(payload), invert)) }),
        makeActionForUndo: ({ payload }) => ({ type: "add", payload }),
      },
      setShape: {
        updateHistory: (state) =>
          mapWithIndex((id, shape) => state.blocks[id]?.shape ?? shape),
        updateState: (payload) =>
          evolve({
            blocks: mapPayloadToProp(payload, "shape"),
          }),
      },
      setPosition: {
        updateHistory: (state) =>
          mapWithIndex(
            (id, position) => state.blocks[id]?.position ?? position
          ),
        updateState: (payload) =>
          evolve({
            blocks: mapPayloadToProp(payload, "position"),
          }),
      },
      setPositionRelative: {
        updateState: (payload) =>
          evolve({
            blocks: updateSelected(payload, (block) => ({
              ...block,
              position: vAdd(block.position, payload[block.id]),
            })),
          }),
        makeActionForUndo: evolve({ payload: map(vScale(-1)) }),
      },
    },
    options: {
      useBranchingHistory: true,
      maxHistoryLength: 10,
    },
    initBranchData,
  });
