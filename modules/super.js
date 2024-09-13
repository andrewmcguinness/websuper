import { Core, Log } from "./core.js";
import { Planet } from "./planet.js";
import { ShipState } from "./ships.js";

const floor = Math.floor;

export class Super {
  constructor() {
    this.flags = Core.flags;

    const planets = [];
    this.date = 0;
    for (let i = 0; i < 31; ++i) planets.push(new Planet(i, this.flags));
    this.starbase = Planet.starbase(this.flags);
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

  consistency_check() {
    const err = Log.error;
    let ship_count = 0;
    for (let s of this.ships) {
      if (s) {
        ++ship_count;
        const p = s.location;
        switch (s.state) {
        case ShipState.docked:
          if (!p.bays.includes(s)) {
            err('ship ' + s.name + ' docked but not in bay');
          }
          break;
        case ShipState.orbit:
          if (!p.orbit.includes(s)) {
            err('ship ' + s.name + ' orbiting but not in orbit');
          }
          break;
        case ShipState.landed:
          if (!p.surface.includes(s)) {
            err('ship ' + s.name + ' landed but not on surface');
          }
          break;
        }
      }
    }
    let ships_found = 0;
    for (let p of this.planets) {
      for (let [area, state] of [['surface', 'landed'],
                                 ['bays', 'docked'],
                                 ['orbit', 'orbit']]) {
        if (p[area]) {
          for (let s of p[area]) {
            if (s) {
              ++ships_found;
              if (s.state != ShipState[state]) {
                err('ship ' + s.name + ' ' + s.state + ' but in ' + area);
              }
            }
          }
        }
      }
    }
    if (ship_count < ships_found) {
      err('have ' + ship_count + ' ships but found ' + ships_found + ' around planets');
    }
    return Log.n;
  };
          
};
