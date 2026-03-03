import p5 from 'p5';
import {data} from './data.js';
import {XKCD} from './xkcd.js';

new p5((p) => {
  const xkcd = new XKCD(p, data);
  p.setup = xkcd.setup;
  p.draw = xkcd.draw;
});
