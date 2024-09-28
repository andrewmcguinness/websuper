import { Core } from "../modules/core.js";
import { Planet } from "../modules/planet.js";
import { test_random } from "./util.js";
import { assertEquals } from "@std/assert";

//function assertEquals(a, b) { console.assert(a == b); }

function sb() {
  test_random([200, 11832, 250]);
  return Planet.starbase(Core.flags);
};  

Deno.test("starbase", () => {
  const p = sb();
  assertEquals(p.state, Core.States.player);
  assertEquals(p.pop, 1700);
  assertEquals(p.credits, 61832);
  assertEquals(p.minerals, 2500);
  assertEquals(p.energy, 3000);
});

Deno.test("evolve", () => {
  const p = sb();
  p.tick(0);
  p.tick(1);
  assertEquals(p.credits, 61832 + 340);
  assertEquals(p.growth, 13);
  assertEquals(p.pop, 1756);
});

Deno.test("morale", () => {
  const p = sb();
  p.tax = 0;
  p.tick(0);
  p.tick(1);
  assertEquals(p.credits, 61832);
  assertEquals(p.growth, 20);
  assertEquals(p.pop, 1786);
  assertEquals(p.morale, 77);
});
