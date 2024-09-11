import { Core } from "../modules/core.js";

export function test_random(values) {
  const ring = values;
  var cursor = 0;
  Core.random = function(min, max) {
    const next = ring[cursor];
    cursor = (cursor + 1)%ring.length;
    return min + next%(max-min);
  }
}
