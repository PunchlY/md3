import {
  blueFromArgb,
  Cam16,
  DynamicColor,
  greenFromArgb,
  Hct,
  lerp,
  redFromArgb,
} from "@material/material-color-utilities";
import { formatWithOptions } from "util";

export function rgbFromArgb(argb: number) {
  return {
    r: redFromArgb(argb),
    g: greenFromArgb(argb),
    b: blueFromArgb(argb),
  };
}

export function lerpArray(
  t: number,
  a: FixedArray<number, 3>,
  b: FixedArray<number, 3>,
): FixedArray<number, 3>;
export function lerpArray(
  t: number,
  a: number[],
  b: number[],
): FixedArray<number, 3>;
export function lerpArray(t: number, a: number[], b: number[]) {
  return a.map((v, i) => lerp(v, b[i]!, t));
}

export function log(
  color: Hct | number,
  ...args: [format?: any, ...param: any[]]
) {
  if (typeof color === "number") color = Hct.fromInt(color);
  const bg = rgbFromArgb(color.toInt());
  const fg = rgbFromArgb(
    Hct.from(
      color.hue,
      color.chroma,
      DynamicColor.foregroundTone(color.tone, 7.5),
    ).toInt(),
  );
  process.stderr.write(
    `\x1b[48;2;${bg.r};${bg.g};${bg.b}m\x1b[38;2;${fg.r};${fg.g};${fg.b}m`,
  );
  process.stderr.write(formatWithOptions({ colors: false }, ...args));
  process.stderr.write("\x1b[0m\x1b[0K");
}

declare global {
  interface IteratorConstructor {
    concat<T>(
      ...value: (
        | Iterator<T, unknown, undefined>
        | Iterable<T, unknown, undefined>
      )[]
    ): IteratorObject<T, undefined, unknown>;
  }

  type _FixedArray<
    T,
    N extends number,
    R extends T[] = [],
  > = R["length"] extends N ? R : _FixedArray<T, N, [...R, T]>;

  type FixedArray<T, N extends number = 1> = _FixedArray<T, N>;
}
