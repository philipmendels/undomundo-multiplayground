import styled from "@emotion/styled";
import * as React from "react";

const Root = styled.div`
  position: absolute;
  background: #666;
  left: -1px;
  width: 2px;
  z-index: 1;
`;

type Props = {
  length: number;
  angle: number;
  position: [number, number];
};
export const TimelineConnection: React.FC<Props> = ({
  length,
  angle,
  position: [cx, cy],
}) => (
  <Root
    style={{
      height: length + "px",
      transform: `translate(${cx}px, ${
        cy - 0.5 * length
      }px) rotate(${angle}rad) `,
    }}
  />
);
