import { Core } from "./core.js";
import { Planet } from "./planet.js";

const floor = Math.floor;

export class Super {
  constructor() {
    const planets = [];
    this.date = 0;
    for (let i = 0; i < 31; ++i) planets.push(new Planet(i));
    this.starbase = Planet.starbase();
    planets.push(this.starbase);
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

  get has_free_ship_slot() {
    const ship_i = this.ships.indexOf(null);
    return (ship_i >= 0);
  };

  buy_ship(ship_type, name) {
    if (!this.has_free_ship_slot) {
      return Core.error("You cannot have more ships");
    }
    if (!this.starbase.bay_free) {
      return Core.error("No free docking bays");
    }
    if (ship_type.credits > this.starbase.credits) {
      return Core.error("Not enough credits");
    }
    if (ship_type.minerals > this.starbase.minerals) {
      return Core.error("Not enough minerals");
    }
    if (ship_type.energy > this.starbase.energy) {
      return Core.error("Not enough energy");
    }
    Core.check(
      this.starbase.try_take_resource("credits", ship_type.credits),
      this.starbase.try_take_resource("minerals", ship_type.minerals),
      this.starbase.try_take_resource("energy", ship_type.energy));
    const s = new ship_type.create(name);
    return this.add_ship(s, this.starbase);
  };

  add_ship(ship, planet) {
    const ship_i = this.ships.indexOf(null);
    if (planet.bay_free && (ship_i >= 0)) {
      this.ships[ship_i] = ship;
      planet.dock_ship(ship);
      return ship;
    }
    else return Core.error("No free docking bay");
  }
};
