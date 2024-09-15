import { Super } from "../modules/super.js";
import { Core } from "../modules/core.js";
import { ShipTypeData } from "../modules/ships.js";

/* global */

var ws;
var economy;
var ships;
var buy;
var docking;
var surface;

function tick() {
  const t = ws.game.tick();
  economy.display(t);
  ships.display(t);
  buy.display(t);
  docking.display(t);
  surface.display(t);
  message(ws.messages.get());
}

function message(msg) {
  if (msg)
    for (let el of document.querySelectorAll('.message'))
      el.textContent = msg;
}

function init() {
  let g = new Super();

  window.ws = {
    game: g,
    ship_types: Object.values(ShipTypeData),
    messages: g.messages.cursor()
  };
  ws = window.ws;

  economy = new economy_screen(g);
  ships = new ships_screen(g);
  buy = new buy_ship_screen(g);
  docking = new docking_screen(g);
  surface = new surface_screen(g);
  ws.economy = economy;

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

function show(screen) {
  document.getElementById(screen).classList.add('visible');
}

function display_bays(elements, ships) {
  const data = ships || [];
  for (let i = 0; i < 3; ++i) {
    const sb = data[i]?.name;
    elements[i*2+1].textContent = sb || 'BAY EMPTY';
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

    const area_buttons = document.getElementById('areas').children;
    this.onclick(area_buttons[0], this.select_orbit);
    this.onclick(area_buttons[1], this.select_surface);
    this.onclick(area_buttons[2], this.select_bays);
    this.selected_area = 'surface';

    this.inputs = map;
    this.food_direction = 0;
    show('economy');
  }

  display(time) {
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
    const delta = p.food_delta;
    if (delta > 0)
      foodstr = pos(p.food);
    else if (delta < 0)
      foodstr = neg(p.food);

    page.food.textContent = foodstr;
    page.minerals.textContent = p.minerals;
    page.fuel.textContent = p.fuel;
    page.energy.textContent = p.energy;

    page.pop.textContent = p.pop;
    page.growth.textContent = gr;
    page.morale.textContent = `${p.morale} %`;
    page.tax.textContent = `${p.tax} %`;

    page.strength.textContent = 0;
    this.display_ships();
  }

  select_orbit(ev) { this.select_area('orbit'); }
  select_surface(ev) { this.select_area('surface'); }
  select_bays(ev) { this.select_area('bays'); }
  select_area(area) {
    this.selected_area = area;
    this.display_ships();
  }
  display_ships() {
    const ships = this.current_planet[this.selected_area].filter(x => x).slice(0, 6);
    const boxes = document.getElementById('econships').children;
    document.getElementById('arealabel').textContent = `SHIPS IN ${this.selected_area}`;
    for (let i = 0; i < 6; ++i) {
      if (ships.length > 0)
        boxes[i].textContent = ships.shift().name;
      else
        boxes[i].textContent = 'EMPTY';
    }
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
    this.game = game;
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
    show('ships');
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
    console.log(this.game.consistency_check());
  }
  send_ship(ev) {}

  dock_ship(ev) {
    const ship = this.current_ship;
    if (ship?.state == Core.ShipState.orbit) {
      const result = ship.location?.dock_ship(ship);
      if (result.is_error) {
        this.ship_message = new temp_message(result.text, 160);
      }
      ships.display();
    }
  }

  select_ship_bay(ev) {
    const i = ev.target.dataset.bay_n;
    const ship = this.ship_bays[i];
    if (ship) {
      this.current_ship = ship;
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
        display_bays(document.querySelector('#ships .bays').children,
                     planet.bays);
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
    show('buy');
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
    this.current_ship_type = ws.ship_types[n];
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

/* Docking bay screen */

class docking_screen extends screen {
  constructor(game) {
    super(game);
    this.game = game;
    this.current_planet = game.starbase;

    const bays = document.querySelector('#docking .bays').children;
    for (let i = 0; i < 3; ++i) {
      const bay = bays[2*i+1];
      bay.dataset.bay_n = i;
      this.onclick(bay, this.select_ship_bay);
    }
    const ship_things = document.querySelector('#docking .ship');
    const passenger_block = ship_things.children[1];
    const fuel_block = ship_things.children[2];
    const other_block = ship_things.children[3];
    this.inputs = {
      type: ship_things.children[0],
      passengers: passenger_block.querySelector('div'),
      fuel: fuel_block.querySelector('div')
    };
    const buttons = ship_things.querySelectorAll('button');
    this.onclick(buttons[0], this.load_passenger);
    this.onclick(buttons[1], this.unload_passenger);
    this.onclick(buttons[2], this.load_fuel);
    this.onclick(buttons[3], this.unload_fuel);
    this.onclick(buttons[4], this.add_crew);
    this.onclick(buttons[5], this.unload_cargo);
    this.onclick(buttons[6], this.scrap);
    show('docking');
  }

  display() {
    document.querySelector('#docking .planet span').textContent =
      this.current_planet?.name || '';
    this.ship_bays = this.current_planet?.bays || [];
    display_bays(document.querySelector('#docking .bays').children,
                 this.ship_bays);
    const real_ships = this.ship_bays.filter(x => x);
    if ((!this.current_ship) && (real_ships.length == 1))
      this.current_ship = real_ships[0];
    let data = [];
    if (this.current_ship?.state == Core.ShipState.docked)
      data = [
        this.current_ship.name,
        this.current_planet.pop,
        this.current_ship.type.seats,
        this.current_ship.type.crew,
        this.current_ship.type.capacity,
        this.current_ship.type.tank,
        this.current_ship.total_cargo,
        this.current_ship.cash_value,
      ];
    const view = document.querySelector('#docking .buyinfo').children;
    for (let i = 0; i < data.length; ++i)
      view[i*2].textContent = data[i] || '';
    if (this.current_ship) {
      this.inputs.type.textContent = this.current_ship.type.key;
      this.inputs.passengers.textContent = this.current_ship.cargo.passengers;
      this.inputs.fuel.textContent = this.current_ship.fuel;
    } else {
      this.inputs.type.textContent = '';
      this.inputs.passengers.textContent = '';
      this.inputs.fuel.textContent = '';
    }
  }

  select_ship_bay(ev) {
    const i = ev.target.dataset.bay_n;
    const ship = this.ship_bays[i];
    if (ship) {
      this.current_ship = ship;
      this.display();
    }
  }

  load_passenger(ev) {}
  unload_passenger(ev) {}
  load_fuel(ev) {
    if (this.current_ship?.state == Core.ShipState.docked) {
      const result = this.current_ship.location.fuel_ship(this.current_ship, 5);
      if (result.is_error)
        this.message(result.text);
    }
  }
  unload_fuel(ev) {
    if (this.current_ship?.state == Core.ShipState.docked) {
      const result = this.current_ship.location.fuel_ship(this.current_ship, 5);
      if (result.is_error)
        this.message(result.text);
    }
  }
  add_crew(ev) {
    if (this.current_ship?.state == Core.ShipState.docked) {
      const result = this.current_ship.add_crew();
      if (result.is_error)
        this.message(result.text);
    }
  }
  unload_cargo(ev) {}
  scrap(ev) {}
  message(msg) {
    if (msg)
      document.querySelector('#docking .messages').textContent = msg;
  }
}

/* Planet Surface screen */

class surface_screen extends screen {
  constructor(game) {
    super(game);
    this.game = game;
    
    const bays = document.querySelector('#surface .bays').children;
    for (let i = 0; i < 3; ++i) {
      const bay = bays[2*i+1];
      bay.dataset.bay_n = i;
      this.onclick(bay, this.deploy)
    }
    this.slots = Array.from(document.querySelector('#surface .slots').children);
    for (let i = 0; i < 6; ++i) {
      const slot = this.slots[i];
      slot.children[0].dataset.n = i;
      this.onclick(slot.children[0], this.toggle);
      slot.children[1].dataset.n = i;
      this.onclick(slot.children[1], this.undeploy);
    }
    this.messagebox = document.querySelector('#surface div.message');
    this.current_planet = this.game.starbase;
    document.getElementById('docking').display
    show('surface');
  }

  display() {
    document.querySelector('#surface .planet span').textContent =
      this.current_planet?.name || '';
    this.bays = this.current_planet?.bays || [];
    display_bays(document.querySelector('#surface .bays').children,
                 this.bays);
    this.ships = this.current_planet.surface.filter(x => x);
    for (let i = 0; i < 6; ++i) {
      const slot = this.slots[i];
      if (this.ships[i]) {
        slot.children[1].textContent = this.ships[i].type.key;
        slot.children[2].textContent = this.ships[i].name;
        slot.children[3].textContent = this.ships[i].active?'RUNNING':'';
      } else {
        slot.children[1].textContent = '';
        slot.children[2].textContent = '';
        slot.children[3].textContent = '';
      }
    }
  }
  toggle(ev) {
    const s = this.ships[ev.target.dataset.n];
    if (s) {
      const result = s.active?s.deactivate():s.activate();
      if (result.is_error) this.message(result.text);
      this.display();
    }
  }
  deploy(ev) {
    const ship = this.bays[ev.target.dataset.bay_n];
    if (ship) {
      const result = this.current_planet.land(ship);
      if (result.is_error) this.message(result.text);
      this.display();
    }
  }
  undeploy(ev) {
    const ship = this.ships[ev.target.dataset.n];
    if (ship) {
      const result = this.current_planet.dock_ship(ship);
      if (result.is_error) this.message(result.text);
      this.display();
    }
  }
  message(msg) {
    this.messagebox.textContent = msg;
  }
}
window.init = init;
