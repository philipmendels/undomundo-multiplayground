import { Dispatch, FC, memo, useRef, useState } from "react";
import styled from "@emotion/styled";
import { pipe } from "fp-ts/function";
import { deleteAt, filter, map } from "fp-ts/Record";
import { vAdd, vScale, vSub } from "vec-la-fp";
import {
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
} from "@mui/material";

import { History, UReducerAction } from "undomundo";

import { Block, CustomBranchData, ID, PBT, State, Vector } from "../models";
import { actionCreators } from "../reducer";

const Root = styled.div`
  display: flex;
  margin-left: 20px;
`;

const Board = styled.div`
  width: 400px;
  height: 500px;
  position: relative;
  border: 1px solid #ddd;
  overflow: hidden;
  user-select: none;
  outline: none;
  margin-bottom: 16px;
`;

const gridSize = 6;

const snap = (pos: number) => Math.round(pos / gridSize);

const isOverlapBetweenBounds = (a: [Vector, Vector], b: [Vector, Vector]) =>
  !(
    a[0][0] > b[1][0] ||
    a[1][0] < b[0][0] ||
    a[0][1] > b[1][1] ||
    a[1][1] < b[0][1]
  );

const Block = styled.div`
  width: ${6 * gridSize}px;
  height: ${6 * gridSize}px;
  background: red;
  position: absolute;
  user-select: none;
  box-sizing: border-box;
`;

const Marquee = styled.div`
  background-color: transparent;
  border: 1px dashed #ccc;
  position: absolute;
  pointer-events: none;
`;

enum PositioningMode {
  ABSOLUTE = "absolute",
  RELATIVE = "relative",
}

const isSelectionKeyDown = (event: React.MouseEvent<unknown>) => {
  if (event.shiftKey || event.metaKey || event.ctrlKey) {
    return true;
  }
  return false;
};

type DragState = {
  type: "MARQUEE" | "BLOCKS";
  startLocation: Vector;
  location?: Vector;
} | null;

const getMarqueeBounds = (
  [x1, y1]: Vector,
  [x2, y2]: Vector
): [Vector, Vector] => {
  return [
    [Math.min(x1, x2), Math.min(y1, y2)],
    [Math.max(x1, x2), Math.max(y1, y2)],
  ];
};

const getMarqueeStyle = ([[left, top], [right, bottom]]: [Vector, Vector]) => {
  return {
    left: left + "px",
    top: top + "px",
    width: right - left + "px",
    height: bottom - top + "px",
  };
};

type Props = {
  state: State;
  history: History<PBT, CustomBranchData>;
  dispatch: Dispatch<UReducerAction<PBT>>;
  isSyncDragEnabled: boolean;
  setIsSyncDragEnabled: (checked: boolean) => void;
};

export const Playground: FC<Props> = memo(
  ({ state, dispatch, isSyncDragEnabled, setIsSyncDragEnabled }) => {
    const [selection, setSelection] = useState<Record<ID, Block>>({});
    const [copied, setCopied] = useState<Record<ID, Block>>({});
    const [dragState, setDragState] = useState<DragState>(null);

    const [positioning, setPositioning] = useState(PositioningMode.ABSOLUTE);

    const containerRef = useRef<HTMLDivElement>(null);

    const blocks = Object.values(state.blocks);

    const getLocation = (e: React.MouseEvent) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const bounds = containerRef.current!.getBoundingClientRect();
      return vSub([e.clientX, e.clientY], [bounds.left, bounds.top]);
    };

    const getFilteredSelection = (): Record<ID, Block> =>
      pipe(
        selection,
        filter<Block>((block) => Boolean(state.blocks[block.id]))
      );

    const getUpdatedSelection = (): Record<ID, Block> =>
      pipe(
        getFilteredSelection(),
        map((block) => state.blocks[block.id])
      );

    const getMovedBlocks = (offset: Vector, blocks = getUpdatedSelection()) =>
      pipe(
        blocks,
        map((block) => vAdd(offset, block.position))
      );

    const moveBlocks = (offset: Vector, blocks = getUpdatedSelection()) => {
      dispatch(actionCreators.setPosition(getMovedBlocks(offset, blocks)));
    };

    return (
      <Root>
        <div>
          <Board
            ref={containerRef}
            onDoubleClick={(e) => {
              const [x, y] = vSub(getLocation(e), [3 * gridSize, 3 * gridSize]);
              const id = String(Math.random());
              dispatch(
                actionCreators.add({
                  [id]: { id, position: [snap(x), snap(y)], shape: "circle" },
                })
              );
            }}
            tabIndex={0}
            onKeyDown={(e) => {
              e.preventDefault();
              if (e.code === "Backspace" || e.code === "Delete") {
                dispatch(actionCreators.remove(getUpdatedSelection()));
              } else if (e.metaKey || e.ctrlKey) {
                if (e.code == "KeyC") {
                  const updatedSelection = getUpdatedSelection();
                  if (Object.keys(updatedSelection).length) {
                    setCopied(updatedSelection);
                  }
                } else if (e.code == "KeyV") {
                  if (Object.keys(copied).length) {
                    const newBlocks: Record<ID, Block> = Object.fromEntries(
                      Object.entries(copied).map(([, block]) => {
                        const id = String(Math.random());
                        return [id, { ...block, id }];
                      })
                    );
                    dispatch(actionCreators.add(newBlocks));
                    setSelection(newBlocks);
                  }
                }
              } else if (e.code === "ArrowUp") {
                moveBlocks([0, -1]);
              } else if (e.code === "ArrowDown") {
                moveBlocks([0, 1]);
              } else if (e.code === "ArrowLeft") {
                moveBlocks([-1, 0]);
              } else if (e.code === "ArrowRight") {
                moveBlocks([1, 0]);
              }
            }}
            onMouseDown={(e) => {
              setSelection({});
              setDragState({
                type: "MARQUEE",
                startLocation: getLocation(e),
              });
            }}
            onMouseUp={() => {
              if (dragState?.location) {
                if (dragState.type === "BLOCKS") {
                  const [offsetX, offsetY] = vSub(
                    dragState.location,
                    dragState.startLocation
                  );

                  const filteredSelection = getFilteredSelection();
                  const snappedOffset: [number, number] = [
                    snap(offsetX),
                    snap(offsetY),
                  ];

                  dispatch(
                    positioning === PositioningMode.ABSOLUTE
                      ? actionCreators.setPosition(
                          getMovedBlocks(snappedOffset, filteredSelection),
                          {
                            undoValue: pipe(
                              filteredSelection,
                              map((block) => block.position)
                            ),
                          }
                        )
                      : actionCreators.setPositionRelative(
                          pipe(
                            filteredSelection,
                            map(() => snappedOffset)
                          ),
                          { skipState: true }
                        )
                  );
                } else if (dragState.type === "MARQUEE") {
                  const bounds = getMarqueeBounds(
                    dragState.location,
                    dragState.startLocation
                  );
                  const filtered = filter<Block>((block) =>
                    isOverlapBetweenBounds(bounds, [
                      vScale(gridSize, block.position),
                      vScale(gridSize, vAdd(block.position, [6, 6])),
                    ])
                  )(state.blocks);
                  setSelection(filtered);
                }
              }
              setDragState(null);
            }}
            onMouseMove={(e) => {
              if (dragState) {
                const location = getLocation(e);

                const prevLocation =
                  dragState.location ?? dragState.startLocation;
                setDragState({ ...dragState, location });

                if (dragState.type === "BLOCKS") {
                  const [offsetX, offsetY] = vSub(
                    location,
                    dragState.startLocation
                  );
                  const snappedOffset: [number, number] = [
                    snap(offsetX),
                    snap(offsetY),
                  ];
                  if (positioning === PositioningMode.ABSOLUTE) {
                    dispatch(
                      actionCreators.setPosition(
                        getMovedBlocks(snappedOffset, getFilteredSelection()),
                        {
                          skipHistory: true,
                        }
                      )
                    );
                  } else {
                    const [offsetXPrev, offsetYPrev] = vSub(
                      prevLocation,
                      dragState.startLocation
                    );
                    const snappedOffsetPrev: [number, number] = [
                      snap(offsetXPrev),
                      snap(offsetYPrev),
                    ];
                    const diff = vSub(snappedOffset, snappedOffsetPrev);
                    dispatch(
                      actionCreators.setPositionRelative(
                        pipe(
                          getFilteredSelection(),
                          map(() => diff)
                        ),
                        { skipHistory: true }
                      )
                    );
                  }
                }
              }
            }}
          >
            {blocks.map((block) => {
              const {
                id,
                position: [x, y],
                shape,
              } = block;
              return (
                <Block
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    const action = actionCreators.setShape({
                      [id]: shape === "circle" ? "square" : "circle",
                    });
                    dispatch(action);
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setDragState({
                      type: "BLOCKS",
                      startLocation: getLocation(e),
                    });
                    const isSelected = Boolean(selection[id]);
                    const updatedSelection = getUpdatedSelection();
                    const newSelection = isSelectionKeyDown(e)
                      ? isSelected
                        ? deleteAt(id)(updatedSelection)
                        : {
                            ...updatedSelection,
                            [id]: block,
                          }
                      : isSelected
                      ? updatedSelection
                      : { [id]: block };
                    setSelection(newSelection);
                  }}
                  key={id}
                  style={{
                    left: x * gridSize + "px",
                    top: y * gridSize + "px",
                    borderRadius: shape === "circle" ? "50%" : "unset",
                    border: selection[id]
                      ? "2px dashed black"
                      : "2px solid red",
                  }}
                />
              );
            })}
            {dragState?.type === "MARQUEE" && dragState.location && (
              <Marquee
                style={{
                  ...getMarqueeStyle(
                    getMarqueeBounds(
                      dragState.location,
                      dragState.startLocation
                    )
                  ),
                }}
              />
            )}
          </Board>
          <FormControl component="fieldset">
            <FormLabel component="legend">Positioning</FormLabel>
            <RadioGroup
              row
              aria-label="positioning"
              value={positioning}
              onChange={(_, value) => setPositioning(value as PositioningMode)}
            >
              <FormControlLabel
                value={PositioningMode.ABSOLUTE}
                control={<Radio color="primary" />}
                label="Absolute"
              />
              <FormControlLabel
                color="primary"
                value={PositioningMode.RELATIVE}
                control={<Radio color="primary" />}
                label="Relative"
              />
            </RadioGroup>
          </FormControl>
          <div>
            <FormControlLabel
              control={
                <Checkbox
                  color="primary"
                  checked={isSyncDragEnabled}
                  onChange={(_, checked) => setIsSyncDragEnabled(checked)}
                />
              }
              label="Sync drag operations to other client"
            />
          </div>
        </div>
      </Root>
    );
  }
);
