import { Super } from "../modules/super.js";

function tick() {
  ws.game.tick();
  display_planet();
}

function build_map() {
  const map = {};
  document.querySelectorAll('input').forEach(i => {
    let n = i.name;
    if (n) map[n] = i;
  });
  return map;
}

function negpc(n) { return `- ${n} %`; }
function pospc(n) { return `+ ${n} %`; }

function display_planet() {
  const page = ws.inputs;
  const p = ws.current_planet;
  let gr = p.growth;
  if (gr < 0) gr = negpc(gr);
  if (gr > 0) gr = pospc(gr);
  page.name.value = p.name;
  page.date.value = ws.game.datestr
  page.status.value = p.state;
  page.credits.value = p.credits;

  page.food.value = p.food;
  page.minerals.value = p.minerals;
  page.fuel.value = p.fuel;
  page.energy.value = p.energy;

  page.pop.value = p.pop;
  page.growth.value = gr;
  page.morale.value = `${p.morale} %`;
  page.tax.value = `${p.tax} %`;

  page.strength.value = 0;
}

function init() {
  let g = new Super();
  window.ws = {
    inputs: build_map(),
    game: g,
    current_planet: g.starbase
  };
  display_planet();
  setInterval(tick, 13);
}

window.init = init;
