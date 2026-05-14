#!/usr/bin/env bun

import {
  argbFromHex,
  argbFromLab,
  argbFromRgb,
  Hct,
  hexFromArgb,
  labFromArgb,
  QuantizerCelebi,
  Score,
  TonalPalette,
  Variant,
} from "@material/material-color-utilities";
import * as png from "fast-png";
import { parseArgs } from "util";
import { version } from "../package.json";
import { generateColor256 } from "./color256";
import { generateTheme } from "./theme";
import { foreground, lerpArray, rgbFromArgb } from "./util";

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    dark: { type: "boolean", default: false },
    contrast: { type: "string" },
    variant: { type: "string" },

    version: { type: "boolean", default: false },
  },
  allowPositionals: true,
});

if (values.version) {
  console.log("%s", version);
  process.exit();
}

const theme = new Map(
  generateTheme({
    sourceColorHct: positionals[0]
      ? parseColor(positionals[0])
      : await sourceColor(Bun.stdin.image()),
    variant: variant(values.variant),
    contrastLevel: values.contrast ? parseFloat(values.contrast) : 0,
    isDark: values.dark,
    specVersion: "2025",
  }),
);

function color(name: string) {
  return theme.get(name)!.toInt();
}

const color256 = Iterator.concat(
  [
    "black",
    "red_dim",
    "green_dim",
    "yellow_dim",
    "blue_dim",
    "magenta_dim",
    "cyan_dim",
    "white",
    "gray",
    "red",
    "green",
    "yellow",
    "blue",
    "magenta",
    "cyan",
    "white_bright",
  ].map(color),
  generateColor256({
    black: color("black"),
    red: color("red_dim"),
    green: color("green"),
    yellow: color("yellow"),
    blue: color("blue_dim"),
    magenta: color("magenta_dim"),
    cyan: color("cyan"),
    white: color("white_bright"),
  }),
).toArray();

if (process.stderr.isTTY) {
  process.stderr.write("\x1b[?7l");
  function bg(color: number) {
    const bg = rgbFromArgb(color);
    return `\x1b[48;2;${bg.r};${bg.g};${bg.b}m`;
  }
  function fg(color: number) {
    const fg = rgbFromArgb(color);
    return `\x1b[38;2;${fg.r};${fg.g};${fg.b}m`;
  }
  for (const [name, hct] of theme) {
    console.error(
      `${bg(hct.toInt())}${fg(foreground(hct))}\x1b[0K%s %s\x1b[0m`,
      hexFromArgb(hct.toInt()),
      name,
    );
  }

  for (let i = 0; i < 16; i++) {
    process.stderr.write(`${bg(color256[i]!)}  `);
  }
  console.error("\x1b[0m");
  const R = labFromArgb(0xffff0000);
  const G = labFromArgb(0xff00ff00);
  const M = labFromArgb(0xffff00ff);
  const B = labFromArgb(0xff0000ff);
  for (let v = 0; v < 12; v++) {
    process.stderr.write(
      `${bg(color256[232 + v * 2]!)}  ${bg(color256[8]!)}  `,
    );

    const Y = lerpArray(v / 11, R, G);
    const P = lerpArray(v / 11, M, B);
    for (let u = 0; u < 12; u++) {
      const color = argbFromLab(...lerpArray(u / 11, Y, P));
      const rgb = rgbFromArgb(color);
      const r = Math.round((rgb.r / 255) * 5);
      const g = Math.round((rgb.g / 255) * 5);
      const b = Math.round((rgb.b / 255) * 5);
      const i = r * 36 + g * 6 + b + 16;
      process.stderr.write(`${bg(color256[i]!)}  `);
    }
    process.stderr.write(
      `${bg(color256[7]!)}  ${bg(color256[232 + 23 - v * 2]!)}  \x1b[0m\n`,
    );
  }
  process.stderr.write("\x1b[?7h");
}

console.log(
  JSON.stringify(
    Object.fromEntries(
      Iterator.concat<[string, number]>(
        theme.entries().map(([key, value]) => [key, value.toInt()]),
        color256.values().map((value, index) => [`color${index}`, value]),
      ).map(([key, argb]) => [
        key,
        {
          hex: hexFromArgb(argb),
          rgb: rgbFromArgb(argb),
        },
      ]),
    ),
  ),
);

function parseColor(value: string) {
  if (value.at(0) === "#") return Hct.fromInt(argbFromHex(value));
  return TonalPalette.fromHueAndChroma(parseInt(value), 120).keyColor;
}

function variant(type: string | undefined) {
  switch (type) {
    case "monochrome":
      return Variant.MONOCHROME;
    case "neutral":
      return Variant.NEUTRAL;
    case "vibrant":
      return Variant.VIBRANT;
    case "expressive":
      return Variant.EXPRESSIVE;
    case "fidelity":
      return Variant.FIDELITY;
    case "content":
      return Variant.CONTENT;
    case "rainbow":
      return Variant.RAINBOW;
    case "fruit-salad":
      return Variant.FRUIT_SALAD;
    case "tonal-spot":
    case undefined:
      return Variant.TONAL_SPOT;
    default:
      throw new Error(
        `Unknown variant type: ${JSON.stringify(type)}. Expected one of: monochrome, neutral, vibrant, expressive, fidelity, content, rainbow, fruit-salad, tonal-spot.`,
      );
  }
}

async function sourceColor(image: Bun.Image) {
  image = image
    .resize(256, 256, {
      filter: "mks2021",
      fit: "inside",
      withoutEnlargement: true,
    })
    .png({ palette: true });

  const buffer = await image.buffer();

  const pixels: number[] = [];
  const value = png.decode(buffer);
  const paletteData = png.convertIndexedToRgb(value);
  const paletteChannels = value.palette![0]!.length;
  for (let i = 0; i < value.width * value.height; i++) {
    const paletteOffset = i * paletteChannels;
    if (paletteChannels === 4 && paletteData[paletteOffset + 3]! < 255)
      continue;
    const red = paletteData[paletteOffset]!;
    const green = paletteData[paletteOffset + 1]!;
    const blue = paletteData[paletteOffset + 2]!;
    const color = argbFromRgb(red, green, blue);
    pixels.push(color);
  }

  const result = QuantizerCelebi.quantize(pixels, 128);
  const ranked = Score.score(result, { desired: 1 });

  return Hct.fromInt(ranked.at(0)!);
}
