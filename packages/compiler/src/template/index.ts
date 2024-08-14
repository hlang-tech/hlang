import BrowserTemplate from "./browser";
import NodeTemplate from "./node";
import { Env } from "../utils";

export default function (env) {
  if (env === Env.BROWSER) {
    return BrowserTemplate;
  } else {
    return NodeTemplate;
  }
}
