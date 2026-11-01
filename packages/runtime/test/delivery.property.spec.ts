/**
 * Property test: on random layered graphs, every sink receives each value
 * exactly once per path from the source (multicast semantics), in the order
 * the source sent the values (first in, first out).
 */
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { Flow } from "../src/index";
import { Apply, Collect, Values } from "./helpers";

/** Layer widths, and for each node after the first layer a bitmask of its inputs in the layer before. */
const layered = fc
  .array(fc.integer({ min: 1, max: 4 }), { minLength: 1, maxLength: 6 })
  .chain((widths) =>
    fc.record({
      widths: fc.constant(widths),
      masks: fc.tuple(
        ...widths.slice(1).map((width, layer) => {
          const previous = widths[layer] ?? 1;
          return fc.array(fc.integer({ min: 1, max: 2 ** previous - 1 }), { minLength: width, maxLength: width });
        }),
      ),
      values: fc.array(fc.integer(), { minLength: 1, maxLength: 5 }),
    }),
  );

describe("delivery (properties)", () => {
  it("delivers each value once per path, in the order it was sent", () => {
    fc.assert(
      fc.property(layered, ({ widths, masks, values }) => {
        const source = new Values(values);
        const firstWidth = widths[0] ?? 1;
        let layer = Array.from({ length: firstWidth }, () => new Apply((value) => value));
        let paths = layer.map(() => 1);
        for (const node of layer) {
          source.O("out").connect(node.I("in"));
        }
        masks.forEach((layerMasks) => {
          const next = layerMasks.map(() => new Apply((value) => value));
          const nextPaths = layerMasks.map((mask, target) => {
            let count = 0;
            layer.forEach((node, index) => {
              if ((mask >> index) & 1) {
                const input = next[target];
                if (input !== undefined) node.O("out").connect(input.I("in"));
                count += paths[index] ?? 0;
              }
            });
            return count;
          });
          layer = next;
          paths = nextPaths;
        });
        const sinks = layer.map((node) => {
          const sink = new Collect();
          node.O("out").connect(sink.I("in"));
          return sink;
        });

        new Flow().run(source);

        sinks.forEach((sink, index) => {
          const copies = paths[index] ?? 0;
          expect(sink.seen).toEqual(values.flatMap((value) => Array.from({ length: copies }, () => value)));
        });
      }),
      { numRuns: 500 },
    );
  });
});
