#!/usr/bin/env bun

import { version } from "../package.json";
import { parseArgs } from "util";
import { argbFromHex, argbFromRgb, blueFromArgb, Cam16, DynamicColor, DynamicScheme, greenFromArgb, Hct, hexFromArgb, QuantizerCelebi, redFromArgb, Score, Variant } from "@material/material-color-utilities/typescript";
import { rgba } from "./png";
import { Ansi } from "./ansi";

const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
        source: { type: "string" },
        image: { type: "string" },
        output: { type: "string" },

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

    ...Ansi,
].filter((c): c is DynamicColor => c !== undefined);

if (values.preview) {
    for (const color of theme) {
        const bg_hct = color.getHct(scheme);
        const bg = rgbFromArgb(bg_hct.toInt());
        const fg = rgbFromArgb(Hct.from(
            bg_hct.hue,
            bg_hct.chroma,
            DynamicColor.foregroundTone(bg_hct.tone, 7.5),
        ).toInt());

        console.error(`\x1b[48;2;${bg.r};${bg.g};${bg.b}m\x1b[38;2;${fg.r};${fg.g};${fg.b}m\x1b[2K%s %s\x1b[0m`, hexFromArgb(bg_hct.toInt()), color.name);
    }
}

await output.write(JSON.stringify(Object.fromEntries(theme.map((color) => [color.name, hexFromArgb(color.getArgb(scheme))]))));

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
            throw new Error(`Unknown variant type: "${type}". Expected one of: monochrome, neutral, vibrant, expressive, fidelity, content, rainbow, fruit-salad, tonal-spot.`);
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
