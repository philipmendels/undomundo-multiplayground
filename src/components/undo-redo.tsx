import * as React from "react";
import styled from "@emotion/styled";
import { Button } from "@mui/material";

const Buttons = styled.div`
  > * {
    margin-right: 10px !important;
  }
  margin-bottom: 10px;
`;

type Props = {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
};

export const UndoRedo: React.FC<Props> = ({ undo, redo, canUndo, canRedo }) => (
  <Buttons>
    <Button size="small" disabled={!canUndo} variant="outlined" onClick={undo}>
      Undo
    </Button>
    <Button size="small" disabled={!canRedo} variant="outlined" onClick={redo}>
      Redo
    </Button>
  </Buttons>
);
