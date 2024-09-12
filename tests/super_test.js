import { Core } from "../modules/core.js";
import { Planet } from "../modules/planet.js";
import { Super } from "../modules/super.js";
import { ShipTypeData, ShipState } from "../modules/ships.js";
import { test_random } from "./util.js";
import { assertEquals } from "@std/assert";

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
  game.tick(); game.tick();
  assertEquals(p.state, States.formatting);
  let fail = 200;
  while((p.state != States.player) && (--fail > 0)) game.tick();
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
  game.tick();
  assertEquals(sb.energy, 2914);
  game.tick();
  assertEquals(sb.energy, 2920);
  sb.dock_ship(sol);
  game.tick();
  assertEquals(sb.energy, 2920);
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
  game.tick();
  assertEquals(sb.energy, 2828);
  game.tick();
  assertEquals(sb.energy, 2840);
  Core.check(sb.dock_ship(sol1));
  game.tick();
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
  game.tick();
  assertEquals(sb.food, 2243);
  assertEquals(sb.energy, 2030);
  it.active = true;
  game.tick();
  assertEquals(sb.food, 2248);
  assertEquals(sb.energy, 2029);
  game.tick();
  assertEquals(sb.food, 2253);
  assertEquals(sb.energy, 2028);
});
