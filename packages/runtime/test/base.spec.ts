import { test } from 'vitest';
import { Flow } from "../src/index";
import Console from "./fixtures/base/console";
import TimestampNode from "./fixtures/base/timestamp";

test("test base flow", async () => {
  const flow = new Flow({});

  const $time = new TimestampNode({
    config: {
      params: {
        interval: 500,
      },
    },
  });

  const $console = new Console({
    config: { params: {} },
    middleware: {
      logger: console.log,
    },
  });

  $time.O("Output").connect($console.I("Input"));

  // run
  flow.run($time);

  await new Promise((resolve) => setTimeout(resolve, 3000));
});
