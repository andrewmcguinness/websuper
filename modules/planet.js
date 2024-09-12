import { Core, Log } from "./core.js";

const States = Core.States;
const Types = Core.Types;
const floor = Math.floor;

const sizes = [ 21726, 11353, 7258, 3438, 8559, 2606, 24763, 17561,
                2267, 10523, 22237, 9725, 13102, 21920, 13060, 22700,
                19872, 4255, 7570, 13860, 4864, 21891, 21403, 12898,
                20340, 13421, 11075, 16245, 6900, 8297, 1372, 10552 ];

export class Planet {
  constructor(location, flags) {
    this.n = location;
    this.size = sizes[location];
    this.state = States.barren;
    this.flags = flags;
    this.orbit = [];
  }

  static resource = [ "food", "minerals", "fuel", "energy",
                      "population", "credits" ];
  static #max = { food: 30000, minerals: 30000, fuel: 30000, energy: 30000,
                  population: 30000, credits: 2000000000 };

  add_resource(r, amount) {
    if (r in Planet.#max) {
      const capacity = Planet.#max[r] - this[r];
      if (amount <= capacity) {
        this[r] += amount;
        return amount;
      } else {
        this[r] += capacity;
        return capacity;
      }
    }
    throw('bad resource ' + r);
  }

  take_resource(r, amount) {
    if (r in this.#max) {
      const capacity = this[r];
      if (amount <= capacity) {
        this[r] -= amount;
        return amount;
      } else {
        this[r] -= capacity;
        return capacity;
      }
    }
    throw('bad resource ' + r);
  }
  
  try_take_resource(r, amount) {
    if (r in Planet.#max) {
      const capacity = this[r];
      if (amount <= capacity) {
        this[r] -= amount;
        return amount;
      } else {
        return 0;
      }
    }
    throw('bad resource ' + r);
  }

  static starbase(flags) {
    const s = new Planet(31, flags);
    s.type = Types.urban;
    s.state = States.player;
    s.pop = Core.random(1500, 2000);
    s.credits = Core.random(50000, 70000);
    const res = Core.random(0, 1000);
    s.food = 2000 + res;
    s.minerals = 2000 + 2*res;
    s.fuel = 2000 + 3*res;
    s.energy = 2000 + 4*res;
    s.tax = 25;
    s.morale = 75;
    s.#slots();
    return s;
  }

  format(owner, name) {
    if (this.state == States.barren) {
      this.state = States.formatting;
      this.format = { days: floor(this.size / 250), owner: owner, name: name };
    }
  }

  #slots() {
    this.surface = [null, null, null, null, null, null];
    this.bays = [null, null, null];
    this.platoons = [];
  }

  formatDone() {
    if (this.state == States.formatting) {
      this.type = Core.randomChoice(Types);
      this.name = this.format.name;
      this.minerals = 20;
      this.energy = 35;
      this.fuel = 150;
      this.pop = Core.random(0, 1000);
      this.food = Core.random(300, 1500);
      this.tax = 25;
      this.morale = 75;
      this.credits = 0;
      this.#slots()
      this.hunger = false;
      this.state = States.player;
      this.format = null;
    }
  }

  get surface_free() {
    return this.surface.indexOf(null) > -1;
  }

  get bay_free() {
    return this.bays.indexOf(null) > -1;
  }

  get surface_ships() {
    return this.surface.filter(x => x);
  }

  get bay_ships() {
    return this.bays.filter(x => x);
  }

  land(ship) {
    if (this.surface_free) {
      this.surface[this.#first_space('surface')] = ship;
      ship.land(this);
      return ship;
    }
    return Core.error('no space to land');
  }

  #first_space(area) {
    return this[area].indexOf(null);
  }

  tick(day) {
    if (this.state == States.player) {
      const eat = floor(this.pop / 240);
      if (eat > this.food) this.hunger = true;
      if (eat < this.food) this.hunger = false;
      if (this.hunger) {
        this.food = 0;
        this.morale = 0;
      } else {
        this.food -= eat;
      }

      const mc = this.tax + this.morale - 100;
      if (mc > 0) --this.morale;
      if (mc < 0) ++this.morale;

      if ((day % 2) == 1) {
        const mm = this.flags.drug?2:3;
        const t1 = floor(this.morale / mm);
        this.growth = t1 - floor(this.tax / 4) - Math.floor((100 - this.morale)/4);
        if (this.growth > 0) {
          if (this.pop > 1) {
            this.pop += floor(this.growth * this.pop / 400);
            if (this.pop > 30000) this.pop = 30000;
          }
        } else if (this.growth < 0) {
          this.pop -= floor(-this.growth * this.pop / 400);
          if (this.pop < 0) this.pop = 0;
        }
      } else {
        const div = (this.type == Types.urban)?125:200;
        const revenue = floor(this.pop * this.tax / div);
        this.credits += revenue;
      }
    }
  }

  dock_ship(ship) {
    const planet_i = this.#first_space('bays');
    if (planet_i >= 0) {
      this.bays[planet_i] = ship;
      ship.dock(this);
      return this;
    }
    else return Core.error("no bay free");
  }

  
}
