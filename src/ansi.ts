import { DynamicColor, TonalPalette, DynamicScheme, MaterialDynamicColors } from "@material/material-color-utilities/typescript";
import { ToneDeltaPair } from "@material/material-color-utilities/typescript/dynamiccolor/tone_delta_pair";
import * as mathUtils from "@material/material-color-utilities/typescript/utils/math_utils";

type FromPaletteOptions = Parameters<typeof DynamicColor.fromPalette>[0];

function dark(color: {
    [K in keyof MaterialDynamicColors]: MaterialDynamicColors[K] extends () => DynamicColor ? K : never
}[keyof MaterialDynamicColors], rename: string) {
    return {
        name: rename,
        palette: (scheme) => scheme.colors[color]().palette({ ...scheme, isDark: true } as DynamicScheme),
        tone: (scheme) => scheme.colors[color]().getTone({ ...scheme, isDark: true } as DynamicScheme),
        chromaMultiplier: (scheme) => scheme.colors[color]().chromaMultiplier?.({ ...scheme, isDark: true } as DynamicScheme) ?? 1,
    } satisfies FromPaletteOptions;
}

class GrayAnsi {
    black() {
        return DynamicColor.fromPalette(dark("surface", "black"));
    }

    white() {
        return DynamicColor.fromPalette(dark("onSurface", "white"));
    }

    gray() {
        return DynamicColor.fromPalette({
            name: "gray",
            palette: (scheme) => TonalPalette.fromHct(this.white().getHct(scheme)),
            tone: (scheme) => scheme.colors.error().getTone(scheme),
        });
    }

    white_bright(): DynamicColor {
        return DynamicColor.fromPalette({
            name: "white_bright",
            palette: (scheme) => TonalPalette.fromHct(this.white().getHct(scheme)),
            toneDeltaPair: () => new ToneDeltaPair(this.white_bright(), this.white(), 5, "lighter", true, "farther"),
        });
    }

    *[Symbol.iterator]() {
        yield this.black();
        yield this.white();
        yield this.gray();
        yield this.white_bright();
    }
}

class Ansi {
    constructor(
        readonly name: string,
        private palette: (scheme: DynamicScheme) => TonalPalette,
    ) { }

    palette_key_color() {
        return DynamicColor.fromPalette({
            name: `${this.name}_palette_key_color`,
            palette: this.palette,
            tone: (s) => s.errorPalette.keyColor.tone,
        });
    }

    regular() {
        return DynamicColor.fromPalette({
            name: this.name,
            palette: this.palette,
            tone: (scheme) => scheme.colors.error().getTone(scheme),
        });
    }

    onRegular() {
        return DynamicColor.fromPalette({
            name: `on_${this.name}`,
            palette: this.palette,
            background: () => this.regular(),
            contrastCurve: (scheme) => scheme.colors.onError().contrastCurve?.(scheme),
        });
    }

    bright(): DynamicColor {
        return DynamicColor.fromPalette({
            name: `${this.name}_bright`,
            palette: this.palette,
            toneDeltaPair: () => new ToneDeltaPair(this.bright(), this.regular(), 5, "lighter", true, "farther"),
        });
    }

    container() {
        return DynamicColor.fromPalette({
            name: `${this.name}_container`,
            palette: this.palette,
            tone: (scheme) => scheme.colors.errorContainer().getTone(scheme),
        });
    }

    onContainer() {
        return DynamicColor.fromPalette({
            name: `on_${this.name}_container`,
            palette: this.palette,
            background: () => this.container(),
            contrastCurve: (scheme) => scheme.colors.onErrorContainer().contrastCurve?.(scheme),
        });
    }

    *[Symbol.iterator]() {
        yield this.palette_key_color();
        yield this.regular();
        yield this.onRegular();
        yield this.bright();
        yield this.container();
        yield this.onContainer();
    }
}

export function* ansiGenerator() {
    yield* new GrayAnsi();

    yield* new Ansi("red", (scheme) => scheme.errorPalette);

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
        yield* new Ansi(
            name,
            (scheme) => {
                const differenceDegrees = mathUtils.differenceDegrees(hue, scheme.primaryPalette.hue);
                const rotationDegrees = Math.min(differenceDegrees * 0.5, 15.0);
                const outputHue = mathUtils.sanitizeDegreesDouble(hue + rotationDegrees * mathUtils.rotationDirection(hue, scheme.primaryPalette.hue));
                return TonalPalette.fromHueAndChroma(
                    outputHue,
                    scheme.errorPalette.chroma,
                );
            },
        );
    }
}