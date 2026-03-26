#!/usr/bin/env bun

import { version } from "../package.json";
import { parseArgs } from "util";
import { argbFromHex, argbFromRgb, Cam16, DynamicColor, Hct, hexFromArgb, QuantizerCelebi, Score, TonalPalette, Variant } from "@material/material-color-utilities";
import { rgba } from "./png";
import { generateTheme } from "./theme";
import { foreground, rgbFromArgb } from "./util";
import { generateColor256 } from "./color256";

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

const theme = new Map(generateTheme({
    sourceColorHct: positionals[0]
        ? parseColor(positionals[0])
        : await sourceColor(Bun.stdin),
    variant: variant(values.variant),
    contrastLevel: values.contrast
        ? parseFloat(values.contrast)
        : 0,
    isDark: values.dark,
    specVersion: "2025",
}));

function* colors(...names: string[]) {
    for (const name of names) {
        yield theme.get(name)!.toInt();
    }
}

const color256 = Iterator.concat(
    colors(
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
    ),
    generateColor256(...colors(
        "black",
        "red_palette_key_color",
        "green_palette_key_color",
        "yellow_palette_key_color",
        "blue_palette_key_color",
        "magenta_palette_key_color",
        "cyan_palette_key_color",
        "white_bright",
    )),
).toArray();

if (process.stderr.isTTY) {
    function bg(color: number) {
        const bg = rgbFromArgb(color);
        return `\x1b[48;2;${bg.r};${bg.g};${bg.b}m`;
    }

    for (const [name, hct] of theme) {
        const bg = rgbFromArgb(hct.toInt());
        const fg = rgbFromArgb(foreground(hct));

        console.error(`\x1b[48;2;${bg.r};${bg.g};${bg.b}m\x1b[38;2;${fg.r};${fg.g};${fg.b}m\x1b[2K%s %s\x1b[0m`, hexFromArgb(hct.toInt()), name);
    }

    for (let i = 0; i < 16; i++) {
        await Bun.stderr.write(`${bg(color256[i]!)}  `);
    }
    console.error("\x1b[0m");
    for (let v = 0; v < 12; v++) {
        await Bun.stderr.write(`${bg(color256[232 + v * 2]!)}  ${bg(color256[8]!)}  `);
        for (let u = 0; u < 12; u++) {
            let x = (u + 0.5) / 12 * 2 - 1;
            let y = (v + 0.5) / 12 * 2 - 1;

            let z = 1 - Math.abs(x) - Math.abs(y);

            if (z < 0) {
                const ox = x;
                x = (1 - Math.abs(y)) * Math.sign(ox);
                y = (1 - Math.abs(ox)) * Math.sign(y);
                z = 1 - Math.abs(x) - Math.abs(y);
            }

            const inv = 1 / Math.max(Math.abs(x), Math.abs(y), Math.abs(z));

            const cx = x * inv;
            const cy = y * inv;
            const cz = z * inv;

            const r = Math.round((cx + 1) * 0.5 * 5);
            const g = Math.round((cy + 1) * 0.5 * 5);
            const b = Math.round((cz + 1) * 0.5 * 5);

            const i = r * 36 + g * 6 + b + 16;
            await Bun.stderr.write(`${bg(color256[i]!)}  `);
        }
        await Bun.stderr.write(`${bg(color256[7]!)}  ${bg(color256[232 + 23 - v * 2]!)}  \x1b[0m\n`);
    }
}

console.log(JSON.stringify(Object.fromEntries(
    Iterator.concat<[string, number]>(
        theme
            .entries()
            .map(([key, value]) => [key, value.toInt()]),
        color256
            .values()
            .map((value, index) => [`color${index}`, value]),
    ).map(([key, argb]) => [key, {
        hex: hexFromArgb(argb),
        rgb: rgbFromArgb(argb),
    }]),
)));

function parseColor(value: string) {
    if (value.at(0) === "#")
        return Hct.fromInt(argbFromHex(value));
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
            throw new Error(`Unknown variant type: ${JSON.stringify(type)}. Expected one of: monochrome, neutral, vibrant, expressive, fidelity, content, rainbow, fruit-salad, tonal-spot.`);
    }
}

async function sourceColor(file: Bun.BunFile) {
    const pixels = rgba(await file.arrayBuffer())
        .filter(([, , , a]) => a === 255)
        .map(([r, g, b]) => argbFromRgb(r, g, b))
        .toArray();
    const result = QuantizerCelebi.quantize(pixels, 128);
    for (const argb of result.keys()) {
        if (Cam16.fromInt(argb).chroma < 5)
            result.delete(argb);
    }
    const ranked = Score.score(result, { desired: 1 });
    return Hct.fromInt(ranked.at(0)!);
}
