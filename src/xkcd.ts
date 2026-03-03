import 'q5';
import Matter from 'matter-js';
import type {Rect} from './types.js';

declare global {
  function image(
    img: Q5.Image,
    x: number,
    y: number,
    width?: number,
    height?: number
  ): void;
}

export class XKCD {
  #img!: Q5.Image;
  #engine!: Matter.Engine;
  #rects!: Rect[];
  #p5: Q5;
  #ground!: Rect;
  #data: Array<[number, number, number, number]>;
  #width!: number;
  #height!: number;

  constructor(p: Q5, data: Array<[number, number, number, number]>) {
    this.#p5 = p;
    this.#data = data;
  }

  #createRect(x: number, y: number, w: number, h: number): Rect {
    const newBody = Matter.Bodies.rectangle(x, y, w, h);
    Matter.Composite.add(this.#engine.world, newBody);

    return {
      body: newBody,
      w: w,
      h: h
    };
  }

  setup = async () => {
    this.#img = await this.#p5.loadImage('images/xkcd.png');
    this.#width = this.#img.width / 2;
    this.#height = this.#img.height / 2;
    const canvas = await this.#p5.Canvas(this.#width, this.#height);
    this.#engine = Matter.Engine.create();

    this.#engine.positionIterations = 1000;
    this.#engine.velocityIterations = 1000;

    let y = 0;
    let ymax = 0;

    for (const rect of this.#data) {
      rect[0] *= 1.07;
      rect[1] *= 1.07;
      rect[2] *= 1.07;
      rect[3] *= 1.07;
    }

    for (const rect of this.#data) {
      rect[1] = this.#height - rect[1] - rect[3] - 20;
      rect[0] += 20;
      y = rect[1] + rect[3];
      ymax = this.#p5.max(y, ymax);
    }

    this.#rects = [];

    this.#ground = this.#createRect(
      this.#width / 2,
      this.#height,
      this.#width,
      2 * 31.535
    );
    Matter.Body.setStatic(this.#ground.body, true);

    for (const [x, y, w, h] of this.#data) {
      const r = this.#createRect(x + 0.5 * w, y + 0.5 * h, w, h);
      Matter.Body.setStatic(r.body, true);
      this.#rects.push(r);
    }

    Matter.Engine.update(this.#engine);

    const theMouse = Matter.Mouse.create(canvas);
    theMouse.pixelRatio = this.#p5.pixelDensity(null as never);
    const mouseConstraint = Matter.MouseConstraint.create(this.#engine, {
      mouse: theMouse
    });
    Matter.Composite.add(this.#engine.world, mouseConstraint);
    Matter.Events.on(mouseConstraint, 'mousedown', () => {
      for (let r of this.#rects) {
        Matter.Body.setStatic(r.body, false);
      }
    });
  };

  draw = () => {
    this.#p5.image(this.#img, 0, 0, this.#width, this.#height);

    Matter.Engine.update(this.#engine);

    this.#p5.strokeWeight(2);
    this.#p5.fill(this.#p5.color(225));
    this.#p5.rectMode('center');

    for (let re of this.#rects) {
      this.#p5.push();
      this.#p5.translate(re.body.position.x, re.body.position.y);
      this.#p5.rotate(re.body.angle);
      this.#p5.rect(0, 0, re.w, re.h, 2);
      this.#p5.pop();
    }

    this.#p5.rectMode('corner');
    this.#p5.noFill();
    this.#p5.strokeWeight(4);
    this.#p5.rect(0, 0, this.#width, this.#height);
  };
}
