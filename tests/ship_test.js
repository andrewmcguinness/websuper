import { Core } from "../modules/core.js";
import { ShipTypeData, ShipState } from "../modules/ships.js";
import { test_random } from "./util.js";
import { assert, assertEquals } from "@std/assert";

Deno.test("solar", () => {
  const sol = new ShipTypeData.solar.create('TEST1', ShipTypeData.solar);
  sol.location = { bays: [] };
  const up = sol.launch();
  assertEquals(up, sol);
});

Deno.test("farming_dry", () => {
  const sol = new ShipTypeData.farming.create('TEST2', ShipTypeData.farming);
  sol.location = { bays: [] };
  const up = sol.launch();
  assert(up.is_error);
});

Deno.test("farming_wet", () => {
  const sol = new ShipTypeData.farming.create('TEST2', ShipTypeData.farming);
  sol.location = { bays: [], take_resource(f, x) { return x; } }
  sol.add_fuel(200);
  const up = sol.launch();
  assertEquals(sol.fuel, 100);
  assertEquals(sol.state, ShipState.orbit);
});
