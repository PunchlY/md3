#!/usr/bin/env bun

import { version } from "../package.json";
import { parseArgs } from "util";
import { argbFromHex, argbFromRgb, blueFromArgb, Cam16, differenceDegrees, DynamicColor, DynamicScheme, greenFromArgb, Hct, hexFromArgb, QuantizerCelebi, redFromArgb, rotationDirection, sanitizeDegreesDouble, Score, TonalPalette, Variant } from "@material/material-color-utilities";
import { rgba } from "./png";

const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
        source: { type: "string" },
        image: { type: "string" },
        output: { type: "string" },
        json: { type: "string", default: "hex" },

        preview: { type: "boolean", default: false },

        dark: { type: "boolean", default: false },
        contrast: { type: "string" },
        variant: { type: "string" },

        version: { type: "boolean", default: false },
    },
});

if (values.version) {
    console.log(version);
    process.exit();
}

const isDark = values.dark;
const contrastLevel = values.contrast
    ? parseFloat(values.contrast)
    : 0;

const source = values.source
    ? argbFromHex(values.source)
    : await sourceColor(values.image ? Bun.file(values.image) : Bun.stdin);

const scheme = new DynamicScheme({
    sourceColorHct: Hct.fromInt(source),
    variant: variant(values.variant),
    contrastLevel,
    isDark,
    specVersion: "2025",
});

const output = values.output ? Bun.file(values.output) : Bun.stdout;

const { colors } = scheme;

const theme = new Map<string, Hct>();
for (const color of [
    colors.primaryPaletteKeyColor(),
    colors.secondaryPaletteKeyColor(),
    colors.tertiaryPaletteKeyColor(),
    colors.neutralPaletteKeyColor(),
    colors.neutralVariantPaletteKeyColor(),
    colors.errorPaletteKeyColor(),

    colors.background(),
    colors.onBackground(),

    colors.surface(),
    colors.surfaceDim(),
    colors.surfaceBright(),

    colors.surfaceContainerLowest(),
    colors.surfaceContainerLow(),
    colors.surfaceContainer(),
    colors.surfaceContainerHigh(),
    colors.surfaceContainerHighest(),

    colors.onSurface(),
    colors.surfaceVariant(),
    colors.onSurfaceVariant(),

    colors.outline(),
    colors.outlineVariant(),

    colors.inverseSurface(),
    colors.inverseOnSurface(),

    colors.shadow(),
    colors.scrim(),
    colors.surfaceTint(),

    colors.primary(),
    colors.primaryDim(),
    colors.onPrimary(),
    colors.primaryContainer(),
    colors.onPrimaryContainer(),
    colors.inversePrimary(),

    colors.primaryFixed(),
    colors.primaryFixedDim(),
    colors.onPrimaryFixed(),
    colors.onPrimaryFixedVariant(),
    colors.secondary(),
    colors.secondaryDim(),
    colors.onSecondary(),
    colors.secondaryContainer(),
    colors.onSecondaryContainer(),

    colors.secondaryFixed(),
    colors.secondaryFixedDim(),
    colors.onSecondaryFixed(),
    colors.onSecondaryFixedVariant(),

    colors.tertiary(),
    colors.tertiaryDim(),
    colors.onTertiary(),
    colors.tertiaryContainer(),
    colors.onTertiaryContainer(),

    colors.tertiaryFixed(),
    colors.tertiaryFixedDim(),
    colors.onTertiaryFixed(),
    colors.onTertiaryFixedVariant(),

    colors.error(),
    colors.errorDim(),
    colors.onError(),
    colors.errorContainer(),
    colors.onErrorContainer(),
]) {
    if (!color)
        continue;
    theme.set(color.name, color.getHct(scheme));
}

theme.set("black", colors.surface().getHct({
    ...scheme,
    isDark: true,
} as DynamicScheme));
theme.set("white", colors.onSurface().getHct({
    ...scheme,
    isDark: true,
} as DynamicScheme));
theme.set("gray", colors.outline().getHct(scheme));
theme.set("white_bright", colors.inverseSurface().getHct({
    ...scheme,
    isDark: true,
} as DynamicScheme));

for (const [name, palette] of ansiPalette(scheme)) {
    for (const color of [
        colors.errorPaletteKeyColor(),
        colors.error(),
        colors.errorDim(),
        colors.onError(),
        colors.errorContainer(),
        colors.onErrorContainer(),
    ]) {
        if (!color)
            continue;
        theme.set(
            color.name.replace("error", name),
            color.getHct({
                ...scheme,
                errorPalette: palette,
            } as DynamicScheme),
        );
    }
}

if (values.preview) {
    for (const [name, hct] of theme) {
        const bg = rgbFromArgb(hct.toInt());
        const fg = rgbFromArgb(Hct.from(
            hct.hue,
            hct.chroma,
            DynamicColor.foregroundTone(hct.tone, 7.5),
        ).toInt());

        console.error(`\x1b[48;2;${bg.r};${bg.g};${bg.b}m\x1b[38;2;${fg.r};${fg.g};${fg.b}m\x1b[2K%j %s\x1b[0m`, toJson(values.json, hct), name);
    }
}

await output.write(JSON.stringify(
    Object.fromEntries(
        theme.entries().map(([name, hct]) => [
            name,
            toJson(values.json, hct),
        ]),
    ),
));

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
    return ranked.at(0)!;
}

function rgbFromArgb(argb: number) {
    return {
        r: redFromArgb(argb),
        g: greenFromArgb(argb),
        b: blueFromArgb(argb),
    };
}

function toJson(type: string, color: Hct) {
    switch (type) {
        case "hex":
            return hexFromArgb(color.toInt());
        case "argb":
            return color.toInt();
        case "rgb":
            return color.toInt() >>> 8;
        case "{rgb}":
            return rgbFromArgb(color.toInt());
        case "[rgb]":
            const { r, g, b } = rgbFromArgb(color.toInt());
            return [r, g, b];
        case "hct":
            return color.toString();
        case "{hct}":
            return {
                h: color.hue,
                c: color.chroma,
                t: color.tone,
            };
        case "[hct]":
            return [color.hue, color.chroma, color.tone];
        default:
            throw new Error(`Unknown json type: ${JSON.stringify(type)}.`);
    }
}

function* ansiPalette(scheme: DynamicScheme): Generator<[string, TonalPalette]> {
    const palettes = new Map<string, TonalPalette>();

    palettes.set("red", scheme.errorPalette);

    for (const [name, hue] of Object.entries({
        red: 25,
        green: 145,
        yellow: 85,
        blue: 265,
        magenta: 355,
        cyan: 205,
        orange: 55,
        purple: 325,
    })) {
        if (palettes.has(name)) {
            yield [name, palettes.get(name)!];
            continue;
        }
        const rotationDegrees = Math.min(differenceDegrees(hue, scheme.sourceColorHct.hue) * 0.5, 15.0);
        const outputHue = sanitizeDegreesDouble(hue + rotationDegrees * rotationDirection(hue, scheme.primaryPalette.hue));
        yield [name, TonalPalette.fromHueAndChroma(
            outputHue,
            scheme.errorPalette.chroma,
        )];
    }
}
