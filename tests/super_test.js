import { Core } from "../modules/core.js";
import { Planet } from "../modules/planet.js";
import { Super } from "../modules/super.js";
import { ShipTypeData, ShipState } from "../modules/ships.js";
import { test_random } from "./util.js";
import { assert, assertEquals, assertFalse } from "@std/assert";

const States = Core.States;

Deno.test("sizes", () => {
  assertEquals(new Super().planet(30).size, 1372);
});

Deno.test("format", () => {
  const game = new Super();
  const sb = game.planet(31);
  const atm = game.buy_ship(ShipTypeData.atmos, 'ATMOS1');
  const p = game.planet(29);
  atm.send(p);
  assertEquals(p.state, States.barren);
  game.tick_all(); game.tick_all();
  assertEquals(p.state, States.formatting);
  let fail = 200;
  while((p.state != States.player) && (--fail > 0)) game.tick_all();
  assertEquals(game.year, 2010);
  assertEquals(game.day, 36);
});


Deno.test("energy", () => {
  test_random([200, 11832, 250]);
  const game = new Super();
  const sb = game.starbase;
  assertEquals(sb.energy, 3000);
  const sol = game.buy_ship(ShipTypeData.solar, 'TEST');
  assertEquals(sb.energy, 2908);
  Core.check(sol.launch());
  game.tick_all();
  assertEquals(sb.energy, 2914);
  game.tick_all();
  assertEquals(sb.energy, 2920);
  sb.dock_ship(sol);
  game.tick_all();
  assertEquals(sb.energy, 2920);
  game.consistency_check();
});

Deno.test("energy2", () => {
  test_random([200, 11832, 250]);
  const game = new Super();
  const sb = game.starbase;
  assertEquals(sb.energy, 3000);
  const sol1 = game.buy_ship(ShipTypeData.solar, 'TEST');
  const sol2 = game.buy_ship(ShipTypeData.solar, 'TEST2');
  assertEquals(sb.energy, 2816);
  Core.check(sol1.launch(), sol2.launch());
  game.tick_all();
  assertEquals(sb.energy, 2828);
  game.tick_all();
  assertEquals(sb.energy, 2840);
  Core.check(sb.dock_ship(sol1));
  game.tick_all();
  assertEquals(sb.energy, 2846);
});

Deno.test("food", () => {
  test_random([200, 11832, 250]);
  const game = new Super();
  const sb = game.starbase;
  assertEquals(sb.food, 2250);
  const it = game.buy_ship(ShipTypeData.farming, 'TEST');
  Core.check(sb.land(it));
  assertEquals(it.state, ShipState.landed);
  game.tick_all();
  assertEquals(sb.food, 2243);
  assertEquals(sb.energy, 2030);
  it.active = true;
  game.tick_all();
  assertEquals(sb.food, 2248);
  assertEquals(sb.energy, 2029);
  game.tick_all();
  assertEquals(sb.food, 2253);
  assertEquals(sb.energy, 2028);
});

Deno.test("travel", () => {
  test_random([200, 11832, 250]);
  const game = new Super();
  const atm = game.buy_ship(ShipTypeData.atmos, 'ATMOS1');
  const p = game.planet(game.starbase.n - 1);
  atm.send(p);
  for (let i = 0; i < 16; ++i) game.tick_all();
  assertEquals(p.state, States.player);
  const frm = game.buy_ship(ShipTypeData.farming, 'FARM1');
  assertFalse(frm.is_error);
  Core.check(game.starbase.fuel_ship(frm, 200));
  assert(frm.launch().is_error);
  assertEquals(frm.location, game.starbase);
  Core.check(frm.add_crew(),
             frm.launch(),
             frm.send(p));
  game.tick_all();
  Core.check(p.dock_ship(frm),
             p.land(frm));
  assertEquals(game.consistency_check(), 0);
});
