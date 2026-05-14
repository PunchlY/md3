import {
  blueFromArgb,
  DynamicColor,
  greenFromArgb,
  Hct,
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
