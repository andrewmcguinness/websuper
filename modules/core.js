class Error {
  constructor(msg) { this.text = msg; }
  get is_error() { return true; }
  toString() { return this.text; }
};

class Coreclass {
  random(min, max) {
    const r = new Uint32Array(1);
    crypto.getRandomValues(r);
    return min + r[0]%(max-min);
  }
  randomChoice(from) {
    const a = Object.values(from);
    return a[this.random(0,a.length)];
  }

  get flags() { return {
    hybrid: false,
    drug: false,
    drill: false,
    valve: false,
    micro: false
  }};

  States = Object.freeze({
    barren: 'unformatted',
    formatting: 'formatting',
    player: 'players',
    enemy: 'enemy'
  });

  Types = Object.freeze({
    urban: 'urban',
    desert: 'desert',
    jungle: 'jungle',
    volcano: 'volcanic'
  });

  error(msg) { return new Error(msg); }
  check(...objs) {
    for (const o of objs)
      if (o.is_error) throw o;
  }
};

export const Core = new Coreclass();

export const Log = {
  error: function(msg) { console.log(msg); }
};

