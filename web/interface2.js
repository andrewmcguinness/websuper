import { Super } from "../modules/super.js";
import { Core } from "../modules/core.js";
import { ShipTypeData } from "../modules/ships.js";

/* global */

var ws;
var ships;

function tick() {
  ws.game.tick();
  economy.display();
  ships.display();
  buy.display();
}

function message(msg) {
  for (let el of document.querySelectorAll('.message'))
    el.textContent = msg;
}

function init() {
  let g = new Super();

  window.ws = {
    game: g,
    ship_types: Object.values(ShipTypeData)
  };
  ws = window.ws;

  economy = new economy_screen(g);
  ships = new ships_screen(g);
  buy = new buy_ship_screen(g);

  economy.display();
  buy.display();
  setInterval(tick, 13);
}

/* utility */

function negpc(n) { return `- ${n} %`; }
function pospc(n) { return `+ ${n} %`; }
function neg(n) { return `- ${n}`; }
function pos(n) { return `+ ${n}`; }

class temp_message {
  constructor(str, ticks) {
    this.str = str;
    this.remaining = ticks;
  }
  get string() {
    if (this.remaining) {
      --this.remaining;
      return this.str;
    } else return null;
  }
}

class screen {
  constructor() {}
  onclick(element, handler) {
    element.addEventListener('click', handler.bind(this));
  }
}


/* economy screen */

class economy_screen extends screen {
  constructor(game) {
    super();
    this.current_planet = game.starbase;
    const map = {};
    for (let block of economy_screen.fields) {
      const div = document.createElement('div');
      div.classList.add('displayblock');
      for (let [f,l] of Object.entries(block)) {
        const wrap = document.createElement('div');
        const val = document.createElement('div');
        val.classList.add('readout');
        val.dataset.name = f;
        map[f] = val;
        const label = document.createElement('div');
        label.classList.add('label');
        label.textContent = l;
        wrap.appendChild(val);
        wrap.appendChild(label);
        div.appendChild(wrap);
      }
      document.getElementById('planet').appendChild(div);
    }
    for (let p of game.planets) {
      const div = document.createElement('div');
      if (p.state == Core.States.enemy) {
        div.textContent = p.name;
        div.classList.add('enemy');
      } else if (p.state == Core.States.player) {
        div.textContent = p.name;
        div.classList.add('player');
      } else div.classList.add('blank');
      div.addEventListener('click', ev => { select_planet(p); });
      document.getElementById('planets').appendChild(div);
    }
    this.onclick(document.getElementById('rename'), this.rename);
    this.onclick(document.getElementById('cashme'), this.transfer_cash);
    const insert = map['tax'].nextElementSibling;
    const reduce = document.createElement('img');
    reduce.src = 'imgs/downarrow';
    reduce.alt = 'v';
    insert.insertAdjacentElement('beforebegin', reduce);
    const increase = document.createElement('img');
    increase.src = 'imgs/uparrow';
    increase.alt = '^';
    this.onclick(increase, this.increase_tax);
    insert.insertAdjacentElement('beforebegin', increase);

    this.onclick(reduce, this.reduce_tax);
    this.inputs = map;
  }

  display() {
    const page = this.inputs;
    const p = this.current_planet;
    let gr = p.growth;
    if (gr < 0) gr = negpc(-gr);
    if (gr > 0) gr = pospc(gr);
    page.name.textContent = p.name;
    page.date.textContent = ws.game.datestr
    page.state.textContent = p.state;
    page.credits.textContent = p.credits;

    let foodstr = String(p.food);
    if (p.food_yesterday) {
      if (p.food_yesterday < p.food)
      foodstr = pos(p.food);
      else if (p.food_yesterday > p.food)
        foodstr = neg(p.food);
    }
    page.food.textContent = foodstr;
    page.minerals.textContent = p.minerals;
    page.fuel.textContent = p.fuel;
    page.energy.textContent = p.energy;

    page.pop.textContent = p.pop;
    page.growth.textContent = gr;
    page.morale.textContent = `${p.morale} %`;
    page.tax.textContent = `${p.tax} %`;

    page.strength.textContent = 0;
  }

  static fields = [{
    name: 'PLANET',
    date: 'DATE',
    state: 'STATUS',
    credits: 'CREDITS'
  },{
    food: 'FOOD',
    minerals: 'MINERALS',
    fuel: 'FUELS',
    energy: 'ENERGY'
  },{
    pop: 'POPULATION',
    growth: 'POP.GROWTH',
    morale: 'MORALE',
    tax: 'TAXRATE',
    strength: 'MILITARY STRENGTH'
  }];

  reduce_tax() {
    if (this.current_planet.tax > 0)
      --this.current_planet.tax;
    economy.inputs.tax.textContent = this.current_planet.tax;
  }
  increase_tax() {
    if (this.current_planet.tax < 100)
      ++this.current_planet.tax;
    economy.inputs.tax.textContent = this.current_planet.tax;
  }
  rename() {}
  transfer_cash() {
    ws.game.transfer_cash();
  }

  select_planet(p) {
    this.current_planet = p;
    economy.display();
  }
}

/* ships screen */

class ships_screen extends screen {
  constructor(game) {
    super()
    this.current_ship = null;
    this.ship_list = [];
    const table = document.querySelector('#ships .shiptable');
    for (let i = 0; i < 32; ++i) {
      const b = document.createElement('div');
      b.dataset.n = i;
      this.onclick(b, this.select_ship_cell);
      table.appendChild(b);
    }
    let bays = document.querySelector('#ships .bays').children;
    for (let i = 0; i < 3; ++i) {
      const bay = bays[2*i+1];
      bay.dataset.bay_n = i;
      this.onclick(bay, this.select_ship_bay);
    }
    
    const buttons = document.querySelector('#ships .moves').children;
    this.onclick(buttons[0], this.launch_ship);
    this.onclick(buttons[1], this.send_ship);
    this.onclick(buttons[2], this.dock_ship);
  
    this.display();
  }

  launch_ship(ev) {
    const ship = this.current_ship;
    if (ship) {
      const result = ship.launch();
      if (result.is_error) {
        this.ship_message = new temp_message(result.text, 160);
      }
      ships.display();
    }
  }
  send_ship(ev) {}
  dock_ship(ev) {}

  select_ship_bay(ev) {
    const i = ev.target.dataset.bay_n;
    const ship = this.ship_bays[i];
    if (ship) {
      ws.current_ship = ship;
      this.display();
    }
  }

  select_ship_cell(ev) {
    const i = ev.target.dataset.n;
    const ship = this.ship_list[i];
    if (ship) {
      this.current_ship = ship;
      this.display();
    }
  }

  ship_state_message(ship) {
    let state = ship.name + ' ';
    switch (ship.state) {
    case Core.ShipState.docked:
      state += 'IS IN A DOCKING BAY ON ' + ship.location.name; break;
    case Core.ShipState.orbit:
      state += 'IS IN NOW IN ORBIT ABOVE ' + ship.location.name; break;
    case Core.ShipState.landed:
      state += 'IS IN ON THE SURFACE OF ' + ship.location.name; break;
    case Core.ShipState.transit:
      state += 'IS NOW IN TRANSIT TO ' + ship.dest?.name; break;
    }
    return state;
  }

  display() {
    const cells = Array.from(document.querySelector('#ships .shiptable').children);
    const all_ships = ws.game.ships.filter(x => x);
    this.ship_list = Array.from(all_ships);
    for (let i = 0; i < 32; ++i) {
      const b = cells[i];
      const ship = all_ships.shift();
      if (ship) b.textContent = ship.name;
      else b.textContent = '';
    }
    const ship = this.current_ship;
    const state_box = document.querySelector('#ships .shipstate');
    if (ship) {
      const planet = ship.location;
      if (planet) {
        state_box.textContent = this.ship_message?.string || this.ship_state_message(ship);
        document.querySelector('#ships .planet span').textContent = planet.name;
        this.ship_bays = Array.from(planet.bays);
        const bays = document.querySelector('#ships .bays').children;
        for (let i = 0; i < 3; ++i) {
          const sb = planet.bays[i]?.name;
          bays[i*2+1].textContent = sb || '';
        }
        const info = document.querySelector('#ships .info');
        info.querySelector('.shipname').textContent = ship.name;
        info.querySelector('.shipcrew').textContent = ship.crew;
        info.querySelector('.date').textContent = ws.game.datestr;
        info.querySelector('.shipfuel').textContent = ship.fuel;
        info.querySelector('.shiptype').textContent = ship.type.name;
      }
    } else {
      state_box.textContent = 'NAVIGATION SYSTEM V6.0 - SELECT A SHIP!';
    }
  }
}

/* buy ship screen */

class buy_ship_screen extends screen {
  constructor(game) {
    super();
    this.current_ship_type = ws.ship_types[0];
    let handlers = [this.prev_ship_type, this.buy_ship, this.next_ship_type];
    for (let button of document.querySelectorAll('#buy .nav button')) {
      this.onclick(button, handlers.shift());
    }
  }
  
  display() {
    const it = this.current_ship_type;
    const sb = ws.game.starbase;
    const count = ws.game.ships.filter(s => (s?.type == it)).length;
    const range = it.tank?(2*it.tank):'infinite';
    let values = [
      sb.credits,
      sb.minerals,
      sb.energy,
      it.credits,
      it.minerals,
      it.energy,
      it.crew,
      it.capacity,
      it.tank,
      count,
      range, // wrong
      it.seats
    ];
    let skip = false;
    for (let d of document.querySelectorAll('#buy .buyinfo > div')) {
      if (skip) skip = false;
      else {
        skip = true;
        d.textContent = values.shift();
      }
    }
    document.querySelector('#buy .buydescription').textContent = it.description;
    document.querySelector('#buy .buytype').textContent = 'TYPE : ' + it.name;
  }

  prev_ship_type(ev) {
    const t = ws.ship_types.indexOf(this.current_ship_type);
    const n = (t == 0)?(ws.ship_types.length - 1):(t-1);
    ws.current_ship_type = ws.ship_types[n];
    this.display();
  }

  buy_ship(ev) {
    const t = this.current_ship_type;
    const result = ws.game.buy_ship(t, ws.game.suggested_name(t));
    if (result.is_error) {
      message(result.msg);
    }
    this.display();
  }

  next_ship_type(ev) {
    const t = ws.ship_types.indexOf(this.current_ship_type);
    const n = (t == ws.ship_types.length - 1)?0:(t+1);
    this.current_ship_type = ws.ship_types[n];
    this.display();
  }
}

window.init = init;
