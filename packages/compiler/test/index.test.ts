"use strict";

import build from "../src";
import graph from "./fixtures/graph";
import * as runScript from "runscript";

test("test parser", async () => {
  const { graphInfo, id } = graph;
  const config = {
    basePackageInfo: [
      {
        code: "Core",
        runtimeResource: "@hlang-org/runtime@latest",
      },
      {
        code: "_",
        runtimeResource: "lodash@latest",
      },
    ],
    dirName: `HLANG_BUILD`,
  };
  const entry = await build({ graphInfo, id, options: config });

  await runScript(`node ${entry}`);
});
