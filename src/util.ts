import {
  blueFromArgb,
  DynamicColor,
  greenFromArgb,
  Hct,
  lerp,
  redFromArgb,
} from "@material/material-color-utilities";

export function foreground(color: Hct) {
  return Hct.from(
    color.hue,
    color.chroma,
    DynamicColor.foregroundTone(color.tone, 7.5),
  ).toInt();
}

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
) {
  return a.map((v, i) => lerp(v, b[i]!, t)) as FixedArray<number, 3>;
}
