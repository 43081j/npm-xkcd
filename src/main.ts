import 'q5';
import {data} from './data.js';
import {XKCD} from './xkcd.js';

const instance = new q5('xkcd');
const xkcd = new XKCD(instance, data);

(instance as typeof instance & {setup: unknown}).setup = xkcd.setup;
instance.draw = xkcd.draw;
