import { Core } from "../modules/core.js";
import { ShipTypeData, ShipState } from "../modules/ships.js";
import { test_random } from "./util.js";
import { assert, assertEquals } from "@std/assert";

Deno.test("solar", () => {
  const sol = new ShipTypeData.solar.create('TEST1', ShipTypeData.solar);
  sol.location = { bays: [], orbit: [] };
  const up = sol.launch();
  assertEquals(up, sol);
});

Deno.test("farming_dry", () => {
  const frm = new ShipTypeData.farming.create('TEST2', ShipTypeData.farming);
  frm.location = { bays: [], orbit: [] };
  const up = frm.launch();
  assert(up.is_error);
});

Deno.test("farming_wet", () => {
  const frm = new ShipTypeData.farming.create('TEST2', ShipTypeData.farming);
  frm.location = { bays: [], orbit: [],
                   take_resource(f, x) { return x; },
                   try_take_resource(f, x) { return x; } }
  Core.check(frm.add_fuel(200),
             frm.add_crew());
  const up = frm.launch();
  Core.check(up);
  assertEquals(frm.fuel, 100);
  assertEquals(frm.state, ShipState.orbit);
});
