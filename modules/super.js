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
    planets.forEach(p => p.add_listener(x => this.receive(x)));
    this.starbase = Planet.starbase(this.flags);
    planets.push(this.starbase);
    this.planets = planets;
    this.ships = Array(24).fill(null);
    this.ship_counts = {};
    this.planet_count = 0;
    this.messages = new Message_buffer(200);
    this.tick_i = 0;
  }
  planet(n) { return this.planets[n]; }
  get year() { return 2010 + floor(this.date / 64); }
  get day()  { return 1 + (this.date % 64); }
  get datestr() { return '' + this.day + '/' + this.year; }
  tick() {
    const tick = this.tick_i;
    this.tick_i = (tick + 1) % 256;
    let i = tick;
    if (i < this.ships.length)
      return this.ships[i]?.tick(this.date);
    i -= 32;
    if (i < 24)
      return; // platoons
    i -= 24;
    if (i < this.planets.length)
      return this.planets[i].tick(this.date);
    i -= this.planets.length;
    if (i < this.planets.length)
      return; // combat;
    i -= this.planets.length;
    if (i < 86)
      return; // s-code
    i = tick;
    if (i == 169)
      return this.reinforce_enemybase();
    if (i == 251)
      return this.attack();
    if (i == 254)
      return this.enemy_formatter();
    if (i == 255)
      ++this.date;
    return this.tick_i + 256 * this.date;
  }

  tick_all() {
    this.ships.forEach(x => { if (x) x.tick(); });
    this.planets.forEach(x => x.tick(this.date));
    ++this.date;
  };

  receive(obj) {
    if (obj.planet)
      if (obj.change == 'formatted')
        ++this.planet_count;
  }

  get has_free_ship_slot() {
    const ship_i = this.ships.indexOf(null);
    return (ship_i >= 0);
  };

  suggested_planet_name() {
    return `planet-${this.planet_count + 1}`;
  }
  suggested_name(ship_type) {
    if (!(ship_type.key in this.ship_counts))
      this.ship_counts[ship_type.key] = 0;
    const n = this.ship_counts[ship_type.key] + 1;
    return ship_type.key + `-${n}`;
  }
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
    if (ship_type.unique &&
        this.ships.some(x => (x.type == ship_type))) {
      return Core.error("You can only have one");
    }
    Core.check(
      this.starbase.try_take_resource("credits", ship_type.credits),
      this.starbase.try_take_resource("minerals", ship_type.minerals),
      this.starbase.try_take_resource("energy", ship_type.energy));
    const s = new ship_type.create(name, ship_type);
    ++this.ship_counts[ship_type.key];
    return this.#add_ship(s, this.starbase);
  };

  transfer_cash() {
    for (let p of this.planets) {
      if ((p.state == Core.States.player) && (p != this.starbase)) {
        const cash = p.credits;
        const got = p.take_resource('credits', cash);
        this.starbase.add_resource('credits', got);
      }
    }
    this.messages.put('All cash transferred!');
  }
  
  #add_ship(ship, planet) {
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
          
  reinforce_enemybase() {}
  attack() {}
  enemy_formatter() {}
};

class Message_buffer {
  constructor(size) {
    this.max = size;
    this.start = 0;
    this.data = [];
  }
  cursor() {
    const buf = this;
    return {
      n: 0,
      get() {
        const m = buf.get(this.n);
        if (m) ++this.n;
        return m;
      }
    };
  }
  has(n) {
    return ((n >= this.start) && (n < (this.start + this.data.length)));
  }
  get(n) {
    if (n < this.start) return null;
    if (n > this.start + this.data.length) return null;
    return this.data[n - this.start];
  }
  put(msg) {
    if (this.data.length >= this.max) {
      const drop = (this.data.length / 2).toFixed(0);
      this.start += drop;
      this.data.splice(0, drop);
    }
    this.data.push(msg);
  }
}
