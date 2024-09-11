import { Core } from "./core.js";
import { Planet } from "./planet.js";

const floor = Math.floor;

class suprem {
  constructor() {
    const planets = [];
    this.date = 0;
    for (let i = 0; i < 31; ++i) planets.push(new Planet(i));
    planets.push(Planet.starbase());
    this.planets = planets;
    this.ships = Array(24).fill(null);
  }
  planet(n) { return this.planets[n]; }
  get year() { return 2010 + floor(this.date / 64); }
  get day()  { return 1 + (this.date % 64); }
  tick() {
    this.planets.forEach(x => x.tick(this.date));
    this.ships.forEach(x => { if (x) x.tick(); });
    ++this.date;
  };

  add_ship(ship, planet) {
    const ship_i = this.ships.indexOf(null);
    if (planet.bay_free && (ship_i >= 0)) {
      this.ships[ship_i] = ship;
      planet.add_ship(ship);
    }
  }
};

export const Super = new suprem();
