import { FC } from "react";

export const App: FC = () => {
  return (
    <h1
      // css={css`
      //   &:hover {
      //     color: green;
      //     background: hotpink;
      //   }
      // `}
      css={{
        "&:hover": {
          color: "green",
          backgroundColor: "hotpink",
        },
      }}
    >
      Hellloooo
    </h1>
  );
};
