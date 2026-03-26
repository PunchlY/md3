import { Blend, DynamicScheme, Hct, TonalPalette, Variant } from "@material/material-color-utilities";

function* colorPalette(scheme: DynamicScheme): Generator<[string, TonalPalette]> {
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
        let amount = 0;
        switch (scheme.variant) {
            case Variant.NEUTRAL:
                amount = scheme.platform === 'phone' ? 50 : 60;
                break;
            case Variant.TONAL_SPOT:
                amount = scheme.platform === 'phone' ? 35 : 45;
                break;
            case Variant.EXPRESSIVE:
                amount = scheme.platform === 'phone' ? 20 : 30;
                break;
            case Variant.VIBRANT:
                amount = scheme.platform === 'phone' ? 5 : 15;
                break;
        }
        yield [name, TonalPalette.fromInt(
            Blend.cam16Ucs(
                TonalPalette.fromHueAndChroma(
                    hue,
                    scheme.errorPalette.chroma,
                ).keyColor.toInt(),
                scheme.sourceColorArgb,
                amount / 180,
            ),
        )];
    }
}

export function* generateTheme(...args: ConstructorParameters<typeof DynamicScheme>): Generator<[string, Hct]> {
    const scheme = new DynamicScheme(...args);

    const { colors } = scheme;

    yield ["source", scheme.sourceColorHct];

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
        yield [color.name, color.getHct(scheme)];
    }

    yield ["black", colors.surface().getHct({
        ...scheme,
        isDark: true,
    } as DynamicScheme)];
    yield ["white", colors.onSurface().getHct({
        ...scheme,
        isDark: true,
    } as DynamicScheme)];
    yield ["gray", colors.outline().getHct(scheme)];
    yield ["white_bright", colors.inverseSurface().getHct({
        ...scheme,
        isDark: true,
    } as DynamicScheme)];

    for (const [name, palette] of colorPalette(scheme)) {
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
            yield [
                color.name.replace("error", name),
                color.getHct({
                    ...scheme,
                    errorPalette: palette,
                } as DynamicScheme),
            ];
        }
    }
}
