import { Super } from "../modules/super.js";
import { Core } from "../modules/core.js";
import { ShipTypeData } from "../modules/ships.js";

/* global */

var ws;
var ship_types;

function init() {
  ws = new view();
  window.ws = ws;
  ws.init();
  const b = document.getElementById('new_game');
  b.parentElement.removeChild(b);
}

var mouse = {
  button_down: function(button, handler) {
    this.current_button = button;
    this.current_button_handler = handler;
    this.down_at = Date.now();
  },
  button_off: function(button) {
    if (button == this.current_button)
      this.current_button = null;
  },
  button_check: function() {
    if (this.current_button && ((Date.now() - this.down_at) > 500)) {
      this.current_button_handler();
    }
  }
};

class view {
  constructor() {
    this.game = new Super();
    ship_types = Object.values(ShipTypeData);
    this.messages = this.game.messages.cursor();
    this.screens = [];
  }

  init() {
    this.main = new main_screen(this.game);
    this.government = new government_screen(this.game);
    this.ships = new ships_screen(this.game);
    this.buy = new buy_ship_screen(this.game);
    this.docking = new docking_screen(this.game);
    this.surface = new surface_screen(this.game);

    this.screens = [ this.main, this.government, this.ships,
                     this.buy, this.docking, this.surface ];

    const navbar = document.querySelector('nav');
    for (let s of this.screens) {
      const b = document.createElement('button');
      const screen = s;
      b.type = 'button';
      b.addEventListener('click', ev => this.navigate(screen, ev));
      b.textContent = s.label;
      navbar.appendChild(b);
    }
    this.main.set_visible(true);

    setInterval(this.tick.bind(this), 13);
  }

  navigate(screen, ev) {
    const match = screen.label || screen;
    this.screens.forEach(s => s.set_visible(s.label == match));
  }

  tick() {
    mouse.button_check();
    const t = this.game.tick();
    this.screens.forEach(s => s.display(t));
    this.message(this.game.messages.get());
  }

  message(msg) {
    if (msg)
      for (let el of document.querySelectorAll('.message'))
        el.textContent = msg;
  }

  planet_selected(p) {
    this.screens.forEach(s => {
      if (s.planet_selected) s.planet_selected(p)
    });
  }
}


/* utility */

function negpc(n) { return `- ${n} %`; }
function pospc(n) { return `+ ${n} %`; }
function neg(n) { return `- ${n}`; }
function pos(n) { return `+ ${n}`; }

class temp_message {
  constructor(str, ticks = 6400) {
    this.#str = str;
    this.remaining = ticks;
  }
  #str;
  get string() {
    if (this.remaining) {
      --this.remaining;
      return this.#str;
    } else return '';
  }
}

function show(screen) {
  document.getElementById(screen).classList.add('visible');
}

function display_planet_list(view, planets) {
  for (let i = 0; i < view.length; ++i) {
    const p = planets[i];
    const div = view[i];
    if (p.state == Core.States.enemy) {
      div.textContent = p.name;
      div.classList.add('enemy');
      div.classList.remove('player', 'blank');
    } else if (p.state == Core.States.player) {
      div.textContent = p.name;
      div.classList.add('player');
      div.classList.remove('enemy', 'blank');
    } else {
      div.textContent = '';
      div.classList.add('blank');
      div.classList.remove('enemy', 'player');
    }
  }
}

function display_bays(elements, ships) {
  const data = ships || [];
  for (let i = 0; i < 3; ++i) {
    const sb = data[i]?.name;
    elements[i*2+1].textContent = sb || 'BAY EMPTY';
  }
}

class name_input {
  constructor(parent, handler) {
    this.container = document.createElement('div');
    this.input = document.createElement('input');
    this.helper = document.createElement('img');
    this.helper.src = 'imgs/tick.png';
    this.container.appendChild(this.input);
    this.container.appendChild(this.helper);
    this.input.type = 'text';
    this.input.max = 8;
    this.input.classList.add('name');
    this.parent = parent;
    this.handler = handler;
    const h = this.enter.bind(this);
    this.input.addEventListener('change', h);
    this.input.addEventListener('keyup', h);
    this.helper.addEventListener('click', h);
  }
  show(initial) {
    this.initial = initial;
    this.input.value = this.initial;
    this.parent.appendChild(this.container);
    this.input.focus();
  }
  hide() {
    this.parent.removeChild(this.container);
  }
  // todo validate name
  enter(ev) {
    if ((ev.type == 'keyup') && (ev.key != 'Enter')) return; // ignore
    this.handler(this.input.value || this.initial);
  }
}

class screen {
  constructor(game, label) {
    this.game = game;
    this.label = label;
  }
  onclick(element, handler) {
    element.addEventListener('click', handler.bind(this));
  }
  onhold(element, handler) {
    this.onclick(element, handler);
    element.addEventListener('mousedown', ev => mouse.button_down(element, handler.bind(this)));
    element.addEventListener('mouseup', ev => mouse.button_off(element));
    element.addEventListener('mouseout', ev => mouse.button_off(element));
  }
  onchange(element, handler) {
    const f = handler.bind(this);
    element.addEventListener('change', f);
    element.addEventListener('keyup', ev => {
      if (ev.key == "Enter") f(ev);
    });
  }
  respond(text) {
    if (text)
      this.response = new temp_message(text, 160);
  }
  set_visible(vis) {
    const me = document.getElementById(this.label);
    if (vis) me.classList.add('visible');
    else me.classList.remove('visible');
  }
  link_navigation(dests) {
    const navbuttons = document.getElementById(this.label).querySelectorAll('.nav button');
    for (let i = 0; i < navbuttons.length; ++i) {
      if (dests[i]) this.onclick(navbuttons[i], ev => ws.navigate(dests[i]));
    }
  }    
}

class formatter_interface {
  constructor(screen, format_button, input_container) {
    this.screen = screen;
    format_button.addEventListener('click', this.format_planet.bind(this));
    this.name_input = new name_input(input_container,
                                     this.new_planet_name.bind(this));
  }

  formatter_available() {
    const formatter = this.screen.game.ships.find(x => (x?.type == ShipTypeData.atmos));
    if (!formatter) return Core.error('You do not have a formatter');
    if (formatter.available) return formatter;
    return Core.error('Formatter is busy!');
  }

  format_planet() {
    const formatter = this.formatter_available();
    const planet = this.screen.current_planet;
    if (formatter.is_error) return this.respond(formatter.text);
    if (planet.formatted)
      return this.respond('This planet is very much alive!');
    const name = this.screen.game.suggested_planet_name();
    this.name_input.show(name);
    this.formatting = {
      planet: planet,
      name: name,
      formatter: formatter
    };
  }

  new_planet_name(name) {
    const formatter = this.formatting.formatter;
    const planet = this.formatting.planet;
    const old_name = this.formatting.name;
    this.formatting = null;
    this.name_input.hide();
    if (formatter) {
      // formatting a new planet
      if (!formatter.available) {
        this.respond('Formatter no longer available!');
        return;
      }
      if (planet.state != Core.States.barren) {
        this.respond('This planet is very much alive!');
        return;
      }
      formatter.format_planet(planet, (name || old_name));
      this.respond('Formatter sent!');
    } else {
      // renaming existing planet
      if (planet.state != Core.States.player)
        return this.respond('Not yours!');
      if (!name)
        return;
      planet.name = name;
    }
  }

  show(suggest_name) {
    this.name_input.show(suggest_name);
  }

  respond(message) {
    this.screen.respond(message);
  }
}

/* Main screen */

class main_screen extends screen {
  constructor(game) {
    super(game, 'main');
    this.planet_index = this.game.planets.length - 1;
    this.current_planet = this.game.planets[this.planet_index];
    const divs = document.querySelectorAll('#main > div');
    this.inputs = {
      date: divs[0],
      type: divs[1],
      planet: divs[2]
    };
    const buttons = document.querySelectorAll('#main button');
    this.onclick(buttons[0], this.planet_info);
    this.onclick(buttons[1], this.home);
    this.onclick(buttons[2], this.planet_up);
    this.onclick(buttons[3], this.planet_down);

    const navbuttons = document.querySelectorAll('#main .nav button');
    const navs = [
      'govt',
      'buy',
      'ships',
      null, //'atmos',
      'army',
      'bays',
      'surface',
      'battle',
      null, //'spy',
      'save'
    ];
    this.link_navigation(navs);
    // todo navbutton for atmos
    this.formatter = new formatter_interface(this,
                                             navbuttons[3],
                                             document.querySelector('#main .prompt'));

  }
  display() {
    this.inputs.date.textContent = this.game.datestr;
    this.inputs.type.textContent = this.current_planet.type;
    this.inputs.planet.textContent = this.current_planet.name || 'LIFELESS!';
  }
  planet_selected(p) {
    if (p != this.current_planet) {
      this.current_planet = p;
      this.planet_index = this.game.planets.indexOf(p);
    }
  }
  planet_info() {}
  home() { this.current_planet = this.game.starbase; }
  planet_up() {
    if (--this.planet_index < 0)
      this.planet_index = this.game.planets.length - 1;
    this.current_planet = this.game.planets[this.planet_index];
    ws.planet_selected(this.current_planet);
  }
  planet_down() {
    if (++this.planet_index >= this.game.planets.length)
      this.planet_index = 0;
    this.current_planet = this.game.planets[this.planet_index];
    ws.planet_selected(this.current_planet);
  }
}

/* government screen */

class government_screen extends screen {
  constructor(game) {
    super(game, 'govt');
    this.current_planet = game.starbase;
    const map = {};
    map.readouts = [];
    for (let block of government_screen.fields) {
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
      map.readouts.push(div);
      document.getElementById('planet').appendChild(div);
    }
    map.planets = document.getElementById('planets');
    map.planet_ops = document.querySelectorAll('#planet button');
    this.formatter = new formatter_interface(this,
                                             map.planet_ops[2],
                                             document.querySelector('#planet .displayblock'));
    for (let p of game.planets) {
      const div = document.createElement('div');
      if (p.state == Core.States.enemy) {
        div.textContent = p.name;
        div.classList.add('enemy');
      } else if (p.state == Core.States.player) {
        div.textContent = p.name;
        div.classList.add('player');
      } else div.classList.add('blank');
      div.addEventListener('click', ev => { this.select_planet(p); });
      map.planets.appendChild(div);
    }
    this.onclick(document.getElementById('rename'), this.ask_rename);
    this.onclick(document.getElementById('cashme'), this.transfer_cash);
    const insert = map['tax'].nextElementSibling;
    const reduce = document.createElement('img');
    reduce.src = 'imgs/downarrow';
    reduce.alt = 'v';
    insert.insertAdjacentElement('beforebegin', reduce);
    const increase = document.createElement('img');
    increase.src = 'imgs/uparrow';
    increase.alt = '^';
    this.onhold(increase, this.increase_tax);
    insert.insertAdjacentElement('beforebegin', increase);
    this.onhold(reduce, this.reduce_tax);

    const area_buttons = document.getElementById('areas').children;
    this.onclick(area_buttons[0], this.select_orbit);
    this.onclick(area_buttons[1], this.select_surface);
    this.onclick(area_buttons[2], this.select_bays);
    this.selected_area = 'surface';

    this.link_navigation([null, 'ships', 'dock']);
    map.response = document.querySelector('#govt .message');
    this.inputs = map;
    
    this.food_direction = 0;
  }

  display(time) {
    const page = this.inputs;
    display_planet_list(this.inputs.planets.children, this.game.planets);
    const p = this.current_planet;
    let gr = p.growth;
    if (gr < 0) gr = negpc(-gr);
    if (gr > 0) gr = pospc(gr);
    page.name.textContent = p.name;
    page.date.textContent = this.game.datestr
    page.state.textContent = p.state;
    page.credits.textContent = p.credits;
    this.inputs.response.textContent = this.response?.string || '';

    if (this.current_planet.formatted) {
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
      this.write_tax();

      page.strength.textContent = 0;
      this.display_ships();
      this.inputs.readouts[1].style.visibility = 'visible';
      this.inputs.readouts[2].style.visibility = 'visible';
    } else {
      this.inputs.readouts[1].style.visibility = 'hidden';
      this.inputs.readouts[2].style.visibility = 'hidden';
    }
  }

  planet_selected(p) {
    if (p != this.current_planet)
      this.current_planet = p;
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
    const boxes = document.getElementById('govtships').children;
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
    this.write_tax();
  }
  increase_tax() {
    if (this.current_planet.tax < 100)
      ++this.current_planet.tax;
    this.write_tax();
  }
  write_tax() {
    const t = this.current_planet.tax;
    this.inputs.tax.textContent = `${t} %`;
  }
  transfer_cash() {
    this.game.transfer_cash();
  }

  select_planet(p) {
    if ((p != this.current_planet) &&
        (p.state != Core.States.enemy)) {
      this.current_planet = p;
      this.display();
      ws.planet_selected(this.current_planet);
    }
  }

  ask_rename() {
    if (this.current_planet.state != Core.States.player)
      return this.respond('not yours!');
    this.name_input.show(this.current_planet.name);
    this.formatting = {
      planet: this.current_planet,
      name: this.current_planet.name
    };
  }
}

/* ships screen */

class ships_screen extends screen {
  constructor(game) {
    super(game, 'ships')
    this.current_ship = null;
    this.ship_list = [];
    this.sending = false;
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

    const head_els = document.querySelectorAll('#ships .heading div');
    this.headings = {}
    for (let i = 0; i < 5; ++i) {
      const out = head_els[i*2];
      this.headings[out.classList[0]] = out;
    }
    
    {
      const buttons = document.querySelector('#ships .moves').children;
      this.onclick(buttons[0], this.launch_ship);
      this.onclick(buttons[1], this.send_ship);
      this.onclick(buttons[2], this.dock_ship);
    }
    {
      const buttons = document.querySelector('#ships .right').children;
      this.onclick(buttons[0], this.cancel_journey);
      this.onclick(buttons[1], this.ask_rename);
    }

    this.name_input = new name_input(document.querySelector('#ships .right'),
                                     this.rename_ship.bind(this));

    this.link_navigation([ null, 'buy', 'dock', 'surface', 'govt', null ]);
    this.display();
  }

  get current() {
    const ship = this.current_ship;
    if (ship && !ship.type) {
      this.current_ship = null;
      ship = null;
    }
    return ship;
  }

  display() {
    const cells = Array.from(document.querySelector('#ships .shiptable').children);
    if (this.sending) {
      display_planet_list(cells, this.game.planets);
    } else {
      const all_ships = this.game.ships.filter(x => x);
      this.ship_list = Array.from(all_ships);
      for (let i = 0; i < 32; ++i) {
        const b = cells[i];
        const ship = all_ships.shift();
        if (ship) b.textContent = ship.name;
        else b.textContent = '';
      }
    }
    const ship = this.current;
    const state_box = document.querySelector('#ships .shipstate');
    let in_motion = false;
    if (ship) {
      const planet = ship.location;
      if (planet && (planet.formatted)) {
        state_box.textContent = this.ship_message?.string || this.ship_state_message(ship);
        document.querySelector('#ships .planet span').textContent = planet.name;
        this.ship_bays = Array.from(planet.bays);
        display_bays(document.querySelector('#ships .bays').children,
                     planet.bays);
        const info = document.querySelector('#ships .info');
        info.querySelector('.shipname').textContent = ship.name;
        info.querySelector('.shipcrew').textContent = ship.crew;
        info.querySelector('.date').textContent = this.game.datestr;
        info.querySelector('.shipfuel').textContent = ship.fuel;
        info.querySelector('.shiptype').textContent = ship.type.name;

        if (ship.state == Core.ShipState.transit) {
          this.headings['ship'].textContent = ship.name;
          this.headings['from'].textContent = ship.location.name;
          this.headings['to'].textContent = ship.dest.name;
          this.headings['eda'].textContent = ship.travel_time
          this.headings['fuel'].textContent = ship.fuel;
          in_motion = true;
        }
      }
    } else {
      state_box.textContent = 'NAVIGATION SYSTEM V6.0 - SELECT A SHIP!';
    }
    if (!in_motion) {
      this.headings['ship'].textContent = '';
      this.headings['from'].textContent = '';
      this.headings['to'].textContent = '';
      this.headings['eda'].textContent = '';
      this.headings['fuel'].textContent = '';
    }
  }

  launch_ship(ev) {
    if (this.sending) return;
    const ship = this.current;
    if (ship) {
      const result = ship.launch();
      if (result.is_error) {
        this.ship_message = new temp_message(result.text, 160);
      }
      this.display();
    }
    console.log(this.game.consistency_check());
  }
  send_ship(ev) {
    const ship = this.current;
    if (ship?.state == Core.ShipState.orbit) {
      this.sending = true;
      this.ship_message = new temp_message('Select the planet to fly to.');
      this.display();
    }
    else this.ship_message = new temp_message('Ship is not in orbit!', 64);
  }

  dock_ship(ev) {
    if (this.sending) return;
    const ship = this.current;
    if (ship?.state == Core.ShipState.orbit) {
      const result = ship.location?.dock_ship(ship);
      if (result.is_error) {
        this.ship_message = new temp_message(result.text, 160);
      } else {
        ws.planet_selected(ship.location);
      }
      this.display();
    }
  }

  select_ship_bay(ev) {
    if (this.sending) return;
    const i = ev.target.dataset.bay_n;
    const ship = this.ship_bays[i];
    if (!ship.type) ship = this.ship_bays[i] = null;
    if (ship)
      this.ship_selected(ship);
  }

  select_ship_cell(ev) {
    if (this.sending) return this.complete_send(ev);
    const i = ev.target.dataset.n;
    const ship = this.ship_list[i];
    if (ship)
      this.ship_selected(ship);
  }

  ship_selected(ship) {
    if (this.current_ship != ship) {
      this.current_ship = ship;
      if (ship.state == Core.ShipState.docked)
        ws.planet_selected(ship.location);
      this.display();
    }
  }
  complete_send(ev) {
    const p = this.game.planets[ev.target.dataset.n];
    var result;
    if (p.state == Core.States.barren) return;
    if (this.current)
      result = this.current.send(p);
    else result = Core.error('ship no longer exists');

    this.sending = false;
    this.ship_message = null;
    if (result.is_error)
      this.ship_message = new temp_message(result.text, 64);
    this.display();
  }

  cancel_journey() {
    if (this.current_ship?.state != Core.ShipState.transit) {
      this.ship_message = new temp_message('Not in transit', 64)
    } else {
      const result = this.game.cancel_ship_journey(this.current_ship);
      if (result.is_error) {
        this.ship_message = new temp_message(result.text, 64);
      } else {
        this.display();
      }
    }
  }

  ask_rename() {
    this.renaming = this.current;
    if (this.renaming) {
      this.name_input.show(this.renaming.name);
    }
  }
  rename_ship(name) {
    this.name_input.hide();
    const ship = this.renaming;
    this.renaming = null;
    if (name && ship && ship.type) {
      ship.name = name;
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
      state += 'IS NOW IN TRANSIT TO ' + ((ship.dest?.name) || 'A DEAD STAR'); break;
    case Core.ShipState.formatting:
      state += 'IS ON THE SURFACE OF A DEAD STAR'; break;
    }
    return state;
  }
}

/* buy ship screen */

class buy_ship_screen extends screen {
  constructor(game) {
    super(game, 'buy');
    this.current_ship_type = ship_types[0];
    let handlers = [this.prev_ship_type, this.buy_ship, this.next_ship_type];
    for (let button of document.querySelectorAll('#buy .nav button')) {
      this.onclick(button, handlers.shift());
    }
    const description = document.querySelector('#buy .buydescription');
    const prompt = new name_input(description, this.receive_ship_name.bind(this));

    this.inputs = {
      info: document.querySelectorAll('#buy .buyinfo > div'),
      description: description,
      response: document.querySelector('#buy .nav .message'),
      type: document.querySelector('#buy .buytype'),
      prompt: prompt
    };
  }
  
  display() {
    const it = this.current_ship_type;
    const sb = this.game.starbase;
    const count = this.game.ships.filter(s => (s?.type == it)).length;
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
    for (let d of this.inputs.info) {
      if (skip) skip = false;
      else {
        skip = true;
        d.textContent = values.shift();
      }
    }
    if (!this.buying)
      this.inputs.description.textContent = it.description;
    this.inputs.type.textContent = 'TYPE : ' + it.name;
    this.inputs.response.textContent = this.response?.string || '';
  }

  prev_ship_type(ev) {
    const t = ship_types.indexOf(this.current_ship_type);
    const n = (t == 0)?(ship_types.length - 1):(t-1);
    this.current_ship_type = ship_types[n];
    this.display();
  }

  buy_ship(ev) {
    const t = this.current_ship_type;
    this.buying = { type: t, name: this.game.suggested_name(t) };
    this.inputs.description.textContent = '';
    this.inputs.prompt.show(this.buying.name);
  }

  next_ship_type(ev) {
    const t = ship_types.indexOf(this.current_ship_type);
    const n = (t == ship_types.length - 1)?0:(t+1);
    this.current_ship_type = ship_types[n];
    this.display();
  }

  receive_ship_name(value) {
    const result = this.game.buy_ship(this.buying.type, value);
    this.inputs.prompt.hide();
    this.buying = null;
    if (result.is_error) {
      this.respond(result.text);
    }
    ws.planet_selected(this.game.starbase);
    this.display();
  }
}

/* Docking bay screen */

class docking_screen extends screen {
  constructor(game) {
    super(game, 'dock');
    this.current_planet = game.starbase;
    this.status = '';

    const bays = document.querySelector('#dock .bays').children;
    for (let i = 0; i < 3; ++i) {
      const bay = bays[2*i+1];
      bay.dataset.bay_n = i;
      this.onclick(bay, this.select_ship_bay);
    }
    const ship_things = document.querySelector('#dock .ship');
    const passenger_block = ship_things.children[1];
    const fuel_block = ship_things.children[2];
    const other_block = ship_things.children[3];
    const buttons = ship_things.querySelectorAll('button');
    this.onhold(buttons[0], this.load_passenger);
    this.onhold(buttons[1], this.unload_passenger);
    this.onhold(buttons[2], this.load_fuel);
    this.onhold(buttons[3], this.unload_fuel);
    this.onclick(buttons[4], this.add_crew);
    this.onclick(buttons[5], this.unload_all_cargo);
    this.onclick(buttons[6], this.scrap);
    const cargo = document.querySelector('#dock .cargo');
    const gauges = cargo.children;
    const commodities = [ 'food', 'minerals', 'fuel', 'energy' ];
    for (let i = 0; i < 4; ++i) {
      this.onhold(gauges[i*5+1], ev => this.unload(commodities[i]));
      this.onhold(gauges[i*5+3], ev => this.load(commodities[i]));
    }
    this.link_navigation(['ships', 'surface', 'govt', 'buy', null]);
    this.inputs = {
      type: ship_things.children[0],
      passengers: passenger_block.querySelector('div'),
      fuel: fuel_block.querySelector('div'),
      planet: document.querySelector('#dock .planet span'),
      bays: document.querySelector('#dock .bays'),
      info: document.querySelector('#dock .buyinfo'),
      response: document.querySelector('#dock .message'),
      cargo_gauges: cargo
    };
    this.emptying = [];
  }

  display() {
    this.continue_unloading();

    this.inputs.planet.textContent = this.current_planet?.name || '';
    this.ship_bays = this.current_planet?.bays || [];
    display_bays(this.inputs.bays.children, this.ship_bays);
    const real_ships = this.ship_bays.filter(x => x);
    if ((!this.current_ship) && (real_ships.length == 1))
      this.current_ship = real_ships[0];
    let data = [];
    if ((this.current_ship?.location != this.current_planet) ||
        (this.current_ship?.state != Core.ShipState.docked))
      this.current_ship = null;
    if (this.current_ship?.state == Core.ShipState.docked) {
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
    } else this.current_ship = null;
    this.inputs.response.textContent = this.response?.string || this.status;
    const view = this.inputs.info.children;
    for (let i = 0; i < 8; ++i)
      view[i*2].textContent = data[i] || '';
    if (this.current_ship) {
      this.inputs.type.textContent = this.current_ship.type.key;
      this.inputs.passengers.textContent = this.current_ship.cargo.passengers;
      this.inputs.fuel.textContent = this.current_ship.fuel;
    } else {
      this.status = '';
      this.inputs.type.textContent = '';
      this.inputs.passengers.textContent = '';
      this.inputs.fuel.textContent = '';
    }

    const commodities = [ 'food', 'minerals', 'fuel', 'energy' ];
    const children = this.inputs.cargo_gauges.children;
    for (let i = 0; i < 4; ++i) {
      const p = this.current_planet[commodities[i]],
            s = this.current_ship?.cargo[commodities[i]] || 0;
      children[i*5+1].value = p;
      children[i*5+2].textContent = p;
      children[i*5+3].value = s;
      children[i*5+4].textContent = s;
    }
  }

  continue_unloading() {
    this.emptying.forEach(e => {
      if (!e.done) {
        if ((e.ship.location == e.planet) &&
            (e.ship.state == Core.ShipState.docked)) {
          for (const r of [ "food", "minerals", "fuel", "energy" ]) {
            if (e.ship.cargo[r] > 0) {
              e.planet.unload_ship(e.ship, r, 5);
              return;
            }
          }
          if (e.ship.cargo.passengers) {
            e.planet.debark_passengers(e.ship, 5);
            return;
          }
        }
        e.done = true;
      }
    });
    this.emptying = this.emptying.filter(e => !e.done);
  }

  select_ship_bay(ev) {
    const i = ev.target.dataset.bay_n;
    const ship = this.ship_bays[i];
    if (ship) {
      this.current_ship = ship;
      this.display();
    }
  }

  planet_selected(p) {
    if ((p != this.current_planet) &&
        p.formatted)
      this.current_planet = p;
  }

  load_passenger(ev) {
    if (this.current_ship?.state == Core.ShipState.docked) {
      const result = this.current_ship.location.embark_passengers(this.current_ship, 1);
      if (result.is_error)
        this.respond(result.text);
    }
  }
  unload_passenger(ev) {
    if (this.current_ship?.state == Core.ShipState.docked) {
      const result = this.current_ship.location.debark_passengers(this.current_ship, 1);
      if (result.is_error)
        this.respond(result.text);
    }
  }
  load_fuel(ev) {
    if (this.current_ship?.state == Core.ShipState.docked) {
      const result = this.current_ship.location.fuel_ship(this.current_ship, 1);
      if (result.is_error)
        this.respond(result.text);
    }
  }
  unload_fuel(ev) {
    if (this.current_ship?.state == Core.ShipState.docked) {
      const result = this.current_ship.location.unfuel_ship(this.current_ship, 1);
      if (result.is_error)
        this.respond(result.text);
    }
  }
  unload_all_cargo() {
    if (this.current_planet && this.current_ship) {
      this.emptying.push({
        planet: this.current_planet,
        ship: this.current_ship
      });
    }
  }
  add_crew(ev) {
    if (this.current_ship?.state == Core.ShipState.docked) {
      const result = this.current_ship.add_crew();
      if (result.is_error)
        this.respond(result.text);
      else this.status = 'Crew now on board!';
    }
  }
  load(commodity) {
    if (this.current_planet && this.current_ship) {
      this.current_planet.load_ship(this.current_ship, commodity, 1);
    }
  }
  unload(commodity) {
    if (this.current_planet && this.current_ship) {
      this.current_planet.unload_ship(this.current_ship, commodity, 1);
    }
  }
  scrap(ev) {
    if (this.current_planet && this.current_ship) {
      this.game.scrap_ship(this.current_ship);
      this.current_ship = null;
      this.display();
    }
  }
}

/* Planet Surface screen */

class surface_screen extends screen {
  constructor(game) {
    super(game, 'surface');
    
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
    this.link_navigation(['buy', 'govt', 'ships', 'dock']);
    this.current_planet = this.game.starbase;
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

  planet_selected(p) {
    if ((p != this.current_planet) &&
        p.formatted)
      this.current_planet = p;
  }

  toggle(ev) {
    const s = this.ships[ev.target.dataset.n];
    if (s && s.type.active_light) {
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
