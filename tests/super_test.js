import { Core } from "../modules/core.js";
import { Planet } from "../modules/planet.js";
import { Super } from "../modules/super.js";
import { Atmos } from "../modules/ships.js";
import { test_random } from "./util.js";
import { assertEquals } from "@std/assert";

const States = Core.States;

Deno.test("sizes", () => {
  assertEquals(Super.planet(30).size, 1372);
});

Deno.test("format", () => {
  const sb = Super.planet(31);
  const atm = new Atmos(sb, 'ATMOS1');
  Super.add_ship(atm, sb);
  const p = Super.planet(29);
  atm.send(p);
  assertEquals(p.state, States.barren);
  Super.tick(); Super.tick();
  assertEquals(p.state, States.formatting);
  let fail = 200;
  while((p.state != States.player) && (--fail > 0)) Super.tick();
  assertEquals(Super.year, 2010);
  assertEquals(Super.day, 36);
});
