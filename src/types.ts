import p5 from 'p5';

export interface Rect {
  body: Matter.Body;
  w: number;
  h: number;
  fillColour: p5.Color;
}
