import { Core } from "./core.js";

class Equipment {
  constructor(name, power, cost) {
    this.name = name;
    this.power = power;
    this.cost = cost;
  }
};

const armour = [
  new Equipment('Basic', 0, 50),
  new Equipment('Carbon Fibre', 1, 100),
  new Equipment('SynthAlloy', 2, 200),
  new Equipment('Personal Force Field', 3, 295)
];
const weapons = [
  new Equipment('Recoil Cannon', 0, 50),
  new Equipment('Self-Loading Gas Cannon', 1, 120),
  new Equipment('Nuclear Mortar', 2, 250),
];

armour.forEach(Object.freeze);
weapons.forEach(Object.freeze);
Object.freeze(armour);
Object.freeze(weapons);

export class Platoon {
  constructor() {
    this.trained = 0;
    this.troops = 0;
    this.weapons = 0;
    this.armour = 0;
    this.commissioned = false;
  }

  get data() {
    return {
      troops: this.troops,
      trained: this.trained,
      commissioned: this.commissioned,
      armour: armour[this.armour],
      weapons: weapons[this.weapons],
      strength: this.strength
    };
  };

  add_troops(n) {
    if (this.commissioned) return Core.error('platoon is commissioned');
    const want = 200 - this.troops;
    const take = Math.min(want, n);
    this.troops += take;
    this.trained = Math.max(this.trained - take, 0);
    return take;
  }

  remove_troops(n) {
    if (this.commissioned) return Core.error('platoon is commissioned');
    const take = Math.min(n, this.troops);
    this.troops -= take;
    return take;
  }

  change_armour(direction) {
    if ((direction == 1)||(direction==-1)) {
      this.armour = (this.armour + direction + armour.length) % armour.length;
      return armour[this.armour];
    }
    return Core.error('bad direction');
  }

  change_weapons(direction) {
    if ((direction == 1)||(direction==-1)) {
      this.weapons = (this.weapons + direction + weapons.length) % weapons.length;
      return weapons[this.weapons];
    }
    return Core.error('bad direction');
  }

  disband() {
    if (!this.commissioned) return Core.error('platoon is not commissioned');
    const take = this.troops;
    this.troops = 0;
    this.trained = 0;
    this.weapons = 0;
    this.armour = 0;
    this.commissioned = false;
  }

  get cost() {
    return this.troops * (armour[this.armour].cost + weapons[this.weapons].cost);
  }

  commission(paytroopst) {
    if (this.commissioned) return Core.error('platoon is commissioned');
    if (this.troops == 0) return Core.error('platoon has no troops');
    if (paytroopst != this.cost()) return Core.error('wrong amount of money');
    this.commissioned = true;
    return paytroopst;
  }

  tick() {
    if ((!this.commissioned) && (this.troops > 0) && (this.training < 100))
      ++this.training;
  }

  get strength() {
    if (!this.commissioned) return 0;
    return Math.floor(this.troops * this.training / 72) *
      (armour[this.armour].power + weapons[this.weapons].power + 1) + this.troops;
  }

  damage(percent) {
    if (!this.commissioned) return Core.error('platoon is not commissioned');
    this.troops = Math.floor(this.troops * (100 - percent) / 100);
    return this.troops;
  }

  add_experience() {
    if (!this.commissioned) return Core.error('platoon is not commissioned');
    if (this.trained <= 93) this.trained += 7;
    return this.trained;
  }
}
