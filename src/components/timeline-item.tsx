import styled from "@emotion/styled";
import { Tooltip } from "@mui/material";
import { motion } from "framer-motion";
import * as React from "react";

const Root = styled(motion.div)`
  width: 16px;
  height: 16px;
  position: absolute;
  left: -8px;
  top: -8px;
  border-radius: 50%;
  box-sizing: border-box;
  background: #ccc;
  z-index: 2;
`;

type Props = {
  onClick: () => void;
  isActive: boolean;
  isActivePast: boolean;
  itemPosition: [number, number];
  previewValue: React.ReactChild;
  id: string;
  color: string;
};

export const TimelineItem: React.FC<Props> = ({
  onClick,
  isActive,
  isActivePast,
  itemPosition,
  // previewType,
  previewValue,
  id,
  color,
}) => {
  const size = isActive ? 16 : 10;
  const [width, height] = [size, size];
  const [x, y] = itemPosition;

  return (
    <Tooltip placement="right" arrow title={isActive ? "" : previewValue}>
      <Root
        layoutId={id}
        style={{
          cursor: isActive ? "default" : "pointer",
          background: isActive ? "#1E1E1E" : color,
          left: x - 0.5 * width + "px",
          top: y - 0.5 * height + "px",
          width: width,
          height: height,
          border: isActive ? `4px solid ${color}` : "none",
          // borderColor: isActive || isActivePast ? "black" : "transparent",
        }}
        onClick={onClick}
      />
    </Tooltip>
  );
};
