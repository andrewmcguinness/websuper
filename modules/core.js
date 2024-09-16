class Error {
  constructor(msg, attrs) {
    this.text = msg;
    this.attrs = attrs;
  }
  get is_error() { return true; }
  toString() {
    const out = this.text;
    for (var [k,v]  in (this.attrs || {}))
      out.append(' ' + k + '=' + v);
    return out;
  }
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
    barren: 'UNFORMATTED',
    formatting: 'FORMATTING',
    player: 'YOUR STAR',
    enemy: 'enemy'
  });

  Types = Object.freeze({
    urban: 'urban',
    desert: 'desert',
    jungle: 'jungle',
    volcano: 'volcanic'
  });

  ShipState = Object.freeze({
    docked: 'docked',
    landed: 'landed',
    orbit: 'orbiting',
    transit: 'transiting',
    formatting: 'formatting',
    destroyed: 'destroyed'
  });

  error(msg, params) { return new Error(msg, params); }
  check(...objs) {
    let i = 0;
    for (const o of objs) {
      if (o == null) throw 'arg ' + i + ' is null';
      if (o.is_error) throw o;
      ++i;
    }
  }
};

export const Core = new Coreclass();

export const Log = {
  error: function(msg) { console.log('' + Log.e() + ': ' + msg); },
  e: function() { Log.n = (Log.n || 0) + 1; return Log.n; },
  n: 0
};

