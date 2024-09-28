import { Core } from "../modules/core.js";
import { Platoon } from "../modules/units.js";
import { assert, assertEquals, assertFalse } from "@std/assert";

Deno.test("empty", () => {
  const it = new Platoon();
  const added = it.add_troops(100);
  assertEquals(added, 100);
  const remains = it.add_troops(120);
  assertEquals(remains, 100);
  assertEquals(it.data.troops, 200);
  assertEquals(it.cost, 20000);
});

