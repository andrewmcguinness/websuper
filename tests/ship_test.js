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
  const frm = new ShipTypeData.farming.create('TEST2', ShipTypeData.farming);
  frm.location = { bays: [] };
  const up = frm.launch();
  assert(up.is_error);
});

Deno.test("farming_wet", () => {
  const frm = new ShipTypeData.farming.create('TEST2', ShipTypeData.farming);
  frm.location = { bays: [], take_resource(f, x) { return x; } }
  frm.add_fuel(200);
  const up = frm.launch();
  assertEquals(frm.fuel, 100);
  assertEquals(frm.state, ShipState.orbit);
});
