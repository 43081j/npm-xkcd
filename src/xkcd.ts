import p5 from 'p5';
import Matter from 'matter-js';
import type {Rect} from './types.js';

export class XKCD {
  #img!: p5.Image;
  #engine!: Matter.Engine;
  #rects!: Rect[];
  #p5: p5;
  #ground!: Rect;
  #data: number[];

  constructor(p: p5, data: number[]) {
    this.#p5 = p;
    this.#data = data;
  }

  #createRect(x: number, y: number, w: number, h: number): Rect {
    const newBody = Matter.Bodies.rectangle(x, y, w, h);
    Matter.Composite.add(this.#engine.world, newBody);

    this.#p5.colorMode(this.#p5.HSB, 255);

    return {
      body: newBody,
      w: w,
      h: h,
      fillColour: this.#p5.color(this.#p5.random(255), 150, 255)
    };
  }

  setup = async () => {
    this.#img = await this.#p5.loadImage('images/xkcd.png');
    const canvas = this.#p5.createCanvas(
      this.#img.width / 2,
      this.#img.height / 2
    );
    this.#engine = Matter.Engine.create();

    this.#engine.positionIterations = 1000;
    this.#engine.velocityIterations = 1000;

    let y = 0;
    let ymax = 0;

    for (let idx = 0; idx < this.#data.length; ++idx) {
      this.#data[idx] *= 1.07;
    }

    for (let idx = 0; idx < this.#data.length; idx += 4) {
      this.#data[idx + 1] =
        this.#p5.height - this.#data[idx + 1] - this.#data[idx + 3] - 20;
      this.#data[idx] += 20;
      y = this.#data[idx + 1] + this.#data[idx + 3];
      ymax = this.#p5.max(y, ymax);
    }

    this.#rects = [];

    this.#ground = this.#createRect(
      this.#p5.width / 2,
      this.#p5.height,
      this.#p5.width,
      2 * 31.535
    );
    Matter.Body.setStatic(this.#ground.body, true);

    for (let idx = 0; idx < this.#data.length; idx += 4) {
      const r = this.#createRect(
        this.#data[idx] + 0.5 * this.#data[idx + 2],
        this.#data[idx + 1] + 0.5 * this.#data[idx + 3],
        this.#data[idx + 2],
        this.#data[idx + 3]
      );
      Matter.Body.setStatic(r.body, true);
      this.#rects.push(r);
    }

    Matter.Engine.update(this.#engine);

    const theMouse = Matter.Mouse.create(canvas.elt);
    theMouse.pixelRatio = this.#p5.pixelDensity();
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
    this.#p5.image(this.#img, 0, 0, this.#p5.width, this.#p5.height);

    Matter.Engine.update(this.#engine);

    this.#p5.strokeWeight(2);
    this.#p5.fill(225);
    this.#p5.rectMode(this.#p5.CENTER);

    for (let re of this.#rects) {
      this.#p5.push();
      this.#p5.translate(re.body.position.x, re.body.position.y);
      this.#p5.rotate(re.body.angle);
      this.#p5.rect(0, 0, re.w, re.h, 2);
      this.#p5.pop();
    }

    this.#p5.rectMode(this.#p5.CORNER);
    this.#p5.noFill();
    this.#p5.strokeWeight(4);
    this.#p5.rect(0, 0, this.#p5.width, this.#p5.height);
  };
}
