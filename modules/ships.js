import { Core } from "./core.js";

const floor = Math.floor;

export const ShipState = Object.freeze({
  docked: 'docked',
  landed: 'landed',
  orbit: 'orbiting',
  transit: 'transiting'
});

export const ShipType = Object.freeze({
  battle: 'Battleship',
  solar: 'Solar Satellite',
  atmos: 'Atmosphere Processor',
  cargo: 'Cargo Transport',
  mining: 'Mining Facility',
  farming: 'Hydroponic Farm'
});


class Ship {
  constructor(name) {
    this.name = name;
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

  leave() {
    const leaving = this.location.orbit;
    const index = leaving.indexOf(this);
    if (index > -1) leaving.splice(index, 1);
  };

  send(planet) {
    if (this.state != ShipState.landed) {
      this.leave();
      this.dest = planet;
      this.travel_time = Math.abs(this.location.n - this.dest.n);
      this.state = ShipState.transit;
    }
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
}

export class Atmos extends Ship {
  constructor(planet, name) {
    super(planet, name);
    this.uses_fuel = false;
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
        this.location.land(this);
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
  }

};
