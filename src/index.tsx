import { createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import ReactDOM from "react-dom";
import { App } from "./app";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
});

const app = document.getElementById("app");
ReactDOM.render(
  <ThemeProvider theme={darkTheme}>
    <CssBaseline />
    <App />
  </ThemeProvider>,
  app
);
