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
  #data: Array<[number, number, number, number, string]>;
  #mouse!: Matter.Mouse;
  #width!: number;
  #height!: number;

  constructor(p: Q5, data: Array<[number, number, number, number, string]>) {
    this.#p5 = p;
    this.#data = data;
  }

  #createRect(x: number, y: number, w: number, h: number): Rect {
    const newBody = Matter.Bodies.rectangle(x, y, w, h);
    Matter.Composite.add(this.#engine.world, newBody);

    return {
      body: newBody,
      w: w,
      h: h,
      name: ''
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

    let maxX = 0;
    let maxY = 0;
    for (const rect of this.#data) {
      maxX = Math.max(maxX, rect[0] + rect[2]);
      maxY = Math.max(maxY, rect[1] + rect[3]);
    }
    const margin = 20;
    const scale = Math.min(
      1,
      (this.#width - margin) / maxX,
      (this.#height - margin) / maxY
    );
    if (scale < 1) {
      for (const rect of this.#data) {
        rect[0] *= scale;
        rect[1] *= scale;
        rect[2] *= scale;
        rect[3] *= scale;
      }
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

    for (const [x, y, w, h, name] of this.#data) {
      const r = this.#createRect(x + 0.5 * w, y + 0.5 * h, w, h);
      r.name = name;
      Matter.Body.setStatic(r.body, true);
      this.#rects.push(r);
    }

    Matter.Engine.update(this.#engine);

    this.#mouse = Matter.Mouse.create(canvas);
    this.#mouse.pixelRatio = this.#p5.pixelDensity(null as never);
    const mouseConstraint = Matter.MouseConstraint.create(this.#engine, {
      mouse: this.#mouse
    });
    Matter.Composite.add(this.#engine.world, mouseConstraint);
    Matter.Events.on(mouseConstraint, 'mousedown', () => {
      for (const r of this.#rects) {
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

    const mp = this.#mouse.position;
    const hit = Matter.Query.point(
      this.#rects.map((r) => r.body),
      mp
    )[0];
    if (hit) {
      const r = this.#rects.find((r) => r.body === hit)!;
      const pad = 4;
      this.#p5.textSize(11);
      const tw = this.#p5.textWidth(r.name);
      const th = 14;
      const tx = this.#p5.constrain(mp.x + 10, 0, this.#width - tw - pad * 2);
      const ty = mp.y - th - 6 < 0 ? mp.y + 6 : mp.y - th - 6;
      this.#p5.fill(this.#p5.color(255));
      this.#p5.strokeWeight(1);
      this.#p5.rect(tx - pad, ty - pad, tw + pad * 2, th + pad * 2, 2);
      this.#p5.fill(this.#p5.color(0));
      this.#p5.noStroke();
      this.#p5.text(r.name, tx, ty + th - 2);
    }
  };
}
