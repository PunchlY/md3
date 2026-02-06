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

const theme = [
    scheme.colors.primaryPaletteKeyColor(),
    scheme.colors.secondaryPaletteKeyColor(),
    scheme.colors.tertiaryPaletteKeyColor(),
    scheme.colors.neutralPaletteKeyColor(),
    scheme.colors.neutralVariantPaletteKeyColor(),
    scheme.colors.errorPaletteKeyColor(),

    scheme.colors.background(),
    scheme.colors.onBackground(),

    scheme.colors.surface(),
    scheme.colors.surfaceDim(),
    scheme.colors.surfaceBright(),

    scheme.colors.surfaceContainerLowest(),
    scheme.colors.surfaceContainerLow(),
    scheme.colors.surfaceContainer(),
    scheme.colors.surfaceContainerHigh(),
    scheme.colors.surfaceContainerHighest(),

    scheme.colors.onSurface(),
    scheme.colors.surfaceVariant(),
    scheme.colors.onSurfaceVariant(),

    scheme.colors.outline(),
    scheme.colors.outlineVariant(),

    scheme.colors.inverseSurface(),
    scheme.colors.inverseOnSurface(),

    scheme.colors.shadow(),
    scheme.colors.scrim(),
    scheme.colors.surfaceTint(),

    scheme.colors.primary(),
    scheme.colors.primaryDim(),
    scheme.colors.onPrimary(),
    scheme.colors.primaryContainer(),
    scheme.colors.onPrimaryContainer(),
    scheme.colors.inversePrimary(),

    scheme.colors.primaryFixed(),
    scheme.colors.primaryFixedDim(),
    scheme.colors.onPrimaryFixed(),
    scheme.colors.onPrimaryFixedVariant(),
    scheme.colors.secondary(),
    scheme.colors.secondaryDim(),
    scheme.colors.onSecondary(),
    scheme.colors.secondaryContainer(),
    scheme.colors.onSecondaryContainer(),

    scheme.colors.secondaryFixed(),
    scheme.colors.secondaryFixedDim(),
    scheme.colors.onSecondaryFixed(),
    scheme.colors.onSecondaryFixedVariant(),

    scheme.colors.tertiary(),
    scheme.colors.tertiaryDim(),
    scheme.colors.onTertiary(),
    scheme.colors.tertiaryContainer(),
    scheme.colors.onTertiaryContainer(),

    scheme.colors.tertiaryFixed(),
    scheme.colors.tertiaryFixedDim(),
    scheme.colors.onTertiaryFixed(),
    scheme.colors.onTertiaryFixedVariant(),

    scheme.colors.error(),
    scheme.colors.errorDim(),
    scheme.colors.onError(),
    scheme.colors.errorContainer(),
    scheme.colors.onErrorContainer(),
]
    .filter((color) => color !== undefined)
    .map((color) => [color.name, color.getHct(scheme)] as const);

theme.push(...ansi(scheme));

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

await output.write(JSON.stringify(Object.fromEntries(theme.map(([name, hct]) => [name, toJson(values.json, hct)]))));

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
    yield ["red", scheme.errorPalette];

    for (const [name, hue] of Object.entries({
        // red: 25,
        green: 145,
        yellow: 85,
        blue: 265,
        magenta: 355,
        cyan: 205,
        orange: 55,
        purple: 325,
    })) {
        const rotationDegrees = Math.min(differenceDegrees(hue, scheme.sourceColorHct.hue) * 0.5, 15.0);
        const outputHue = sanitizeDegreesDouble(hue + rotationDegrees * rotationDirection(hue, scheme.primaryPalette.hue));
        yield [name, TonalPalette.fromHueAndChroma(
            outputHue,
            scheme.errorPalette.chroma,
        )];
    }
}

function* ansi(scheme: DynamicScheme) {
    const { colors } = scheme;
    yield ["dark", colors.surface().getHct({
        ...scheme,
        isDark: true,
    } as DynamicScheme)] as const;
    yield ["white", colors.onSurface().getHct({
        ...scheme,
        isDark: true,
    } as DynamicScheme)] as const;
    yield ["gray", colors.outline().getHct(scheme)] as const;
    yield ["white_bright", colors.inverseSurface().getHct({
        ...scheme,
        isDark: true,
    } as DynamicScheme)] as const;
    for (const [name, palette] of ansiPalette(scheme)) {
        yield* [
            colors.errorPaletteKeyColor(),
            colors.error(),
            colors.errorDim() ?? colors.error(),
            colors.onError(),
            colors.errorContainer(),
            colors.onErrorContainer(),
        ].map((color) => [
            color.name.replace(/error/, name),
            color.getHct({
                ...scheme,
                errorPalette: palette,
            } as DynamicScheme),
        ] as const);
    }
}