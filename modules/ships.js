import { Core } from "./core.js";

const floor = Math.floor;

export const ShipState = Core.ShipState;

export const ShipType = Object.freeze({
  battle: 'Battleship',
  solar: 'Solar Satellite',
  atmos: 'Atmosphere Processor',
  cargo: 'Cargo Transport',
  mining: 'Mining Facility',
  farming: 'Hydroponic Farm'
});

class Ship {
  constructor(name, type) {
    this.name = name;
    this.type = type;
    this.state = ShipState.docked;
    this.fuel = 0;
    this.crew = 0;
    this.cargo = {
      food: 0,
      minerals: 0,
      fuel: 0,
      energy: 0,
      passengers: 0
    };
  };

  // placeholder for now
  messages = [];

  get uses_fuel() { return (this.type.tank != 0); }

  leave() {
    const leaving = this.location.orbit;
    const index = leaving.indexOf(this);
    if (index > -1) leaving.splice(index, 1);
  };

  send(planet) {
    if (this.state != ShipState.landed) {
      const distance = Math.abs(planet.n - this.location.n);
      const fuel_needed = distance*(Core.flags.valve?25:50);
      if (this.uses_fuel && (fuel_needed > this.fuel)) {
        return Core.error("Not enough fuel");
      }      
      this.leave();
      this.dest = planet;
      this.travel_time = Math.abs(this.location.n - this.dest.n);
      this.state = ShipState.transit;
    }
    return this;
  };

  launch() {
    if (this.state == ShipState.docked) {
      if (this.crew < this.type.crew) {
        return Core.error('need a crew');
      }
      const launch_fuel = Core.flags.valve?50:100;
      if (this.uses_fuel) {
        if (this.fuel < launch_fuel) 
          return Core.error('not enough fuel');
        else
          this.fuel -= launch_fuel;
      }
      this.state = ShipState.orbit;
      const leaving = this.location.bays;
      const index = leaving.indexOf(this);
      if (index > -1) leaving[index] = null;
      return this;
    }
    else return Core.error('Not in bay');
  };

  get fuel_space() {
    return this.type.tank - this.fuel;
  };

  add_fuel(quantity) {
    if (this.state != ShipState.docked)
      return Core.error('Not in dock');
    this.fuel += quantity;
    if (this.fuel > this.tank) this.fuel = this.tank;
    return quantity;
  };

  add_crew() {
    if (this.state == ShipState.docked) {
      const want = this.type.crew - this.crew;
      const got = this.location.try_take_resource('pop', want);
      if (want == got) {
        this.crew += want;
        return got;
      }
      else return Core.error('Not enough population', { want: want, have: this.location.pop });
    }
    else return Core.error('Not in dock');
  }

  get cargo_space() {
    return this.type.capacity - (this.cargo.food +
                                 this.cargo.fuel +
                                 this.cargo.minerals +
                                 this.cargo.energy);
  }

  add_cargo(resource, amount) {
    if (this.state == ShipState.docked) {
      this[resource] += amount;
      return amount;
    } else return Core.error('Not in dock');
  }

  dock(planet) {
    this.location = planet;
    this.state = ShipState.docked;
  };

  land(planet) {
    this.state = ShipState.landed;
    if (this.active) this.active = false;
    return this;
  };

  move() {
    if (this.state == ShipState.transit) {
      if (this.uses_fuel) {
        this.fuel -= Core.flags.valve?25:50;
        if (this.fuel < 0) this.fuel = 0;
      }
      if (--this.travel_time == 0) {
        this.state = ShipState.orbit;
        this.location = this.dest;
        this.location.orbit.push(this);
        return true;
      }
    }
    return false;
  }

  tick() { this.move(); }
}

class Farming extends Ship {
  constructor(name) {
    super(name, ShipTypeData.farming);
  }

  tick() {
    this.move();
    if (this.state == ShipState.landed) {
      if (this.active) {
        const power = this.location.try_take_resource("energy", 1);
        if (power == 1) {
          const food = (this.location.flags.hybrid?27:12) +
                ((this.location.type == Core.Types.jungle)?28:0);
          this.location.add_resource("food", food);
        } else {
          this.active = false;
          this.messages.add('Run out of energy on ' + this.location.name);
        }
      }
    }
  }
}

class Solar extends Ship {
  constructor(name) {
    super(name, ShipTypeData.solar);
  }

  tick() {
    this.move();
    if (this.state == ShipState.orbit) {
      if (this.location.state == Core.States.player) {
        const product = (this.location.type == Core.Types.desert)?13:6;
        this.location.add_resource("energy", product);
      }
    }
  }
}

class Atmos extends Ship {
  constructor(name) {
    super(name, ShipTypeData.atmos);
  }

  tick() {
    if (this.move()) {
      this.state = ShipState.formatting;
      this.location.state = Core.States.formatting;
    }
    else if (this.state == ShipState.formatting) {
      if (--this.format_days == 0) {
        this.location.formatDone();
        this.state = ShipState.landed;
        Core.check(this.location.dock_ship(this),
                   this.location.land(this));
      }
    }
  }

  leave() {
    super.leave();
    ['bays', 'surface'].forEach(m => {
      const leaving = this.location[m];
      const index = leaving.indexOf(this);
      if (index > -1) leaving[index] = null;
    });
  }
  
  send(planet) {
    super.send(planet);
    this.format_days = floor(planet.size / 250);
    return this;
  }

};

class TypeDataItem {
  constructor(key, name, description, credits, minerals, energy, crew,
              tank, capacity, seats, platoons, clazz) {
    this.key = key;
    this.name = name;
    this.description = description;
    this.credits = credits;
    this.minerals = minerals;
    this.energy = energy;
    this.crew = crew;
    this.tank = tank;
    this.capacity = capacity;
    this.seats = seats;
    this.platoons = platoons;
    this.create = clazz;
  }
}
    
export const ShipTypeData = Object.fromEntries([
  new TypeDataItem("atmos", "Atmosphere Processor",
                   "Generates new living planets from lifeless ones",
                   26753, 75, 999, 0,   0, 0, 0, 0, Atmos),
  new TypeDataItem("solar", "Solar Sat Generator",
                   "Transmits solar energy back to planet from orbit",
                   975, 7, 92, 0,   0, 0, 0, 0, Solar),
  new TypeDataItem("battle", "B-29 Battle Cruiser",
                   "Carries four fully equipped platoons into battle",
                   5250, 95, 365, 21,   850, 600, 4500, 4, Ship),
  new TypeDataItem("mining", "Core Mining Station",
                   "Generates fuels & minerals when running on surface",
                   17999, 600, 875, 294,   1400, 950, 0, 0, Ship),
  new TypeDataItem("farming", "Horticultural Station",
                   "Generates food supplies when running on surface",
                   16995, 540, 970, 175,    750, 950, 0, 0, Farming),
  new TypeDataItem("cargo", "Cargo Store / Carrier",
                   "Deep space heavy duty cargo / personnel carrier",
                   15400, 125, 465, 11,    1250, 2250, 1850, 0, Ship)
].map(i => [i.key, i]));
