import { Core } from "./modules/core.js";
import { Planet } from "./modules/planet.js";

function main() {
  const p1 = new Planet(0, 5231);
  const p0 = Planet.starbase();

  for (let day = 0; day < 32; ++day) {
    p0.tick(day);
    console.log(`Planet, pop ${p0.pop}, food ${p0.food} credits ${p0.credits}`);
  }
}

main();
