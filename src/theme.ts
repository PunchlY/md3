import {
  DynamicScheme,
  differenceDegrees,
  Hct,
  TonalPalette,
  type Variant,
} from "@material/material-color-utilities";

const centroids = {
  red: 27,
  yellow: 71,
  green: 142,
  cyan: 197,
  blue: 274,
  magenta: 335,
};

function nearestNamedColors(color: Hct) {
  return Object.entries(centroids)
    .map(([name, hue]) => [name, differenceDegrees(color.hue, hue)] as const)
    .sort(([, a], [, b]) => a - b)[0]![0];
}

interface Options {
  sourceColors: number[];
  variant: Variant;
  contrastLevel: number;
  isDark: boolean;
}

export function* generateTheme(options: Options): Generator<[string, number]> {
  const sourceColors = Object.entries(
    Object.groupBy(
      options.sourceColors
        .map(Hct.fromInt)
        .filter(({ chroma, tone }) => chroma >= 12 && tone >= 8 && tone <= 95),
      nearestNamedColors,
    ),
  ).map(
    ([name, colors]) =>
      [name, colors!.sort((a, b) => b.chroma - a.chroma)[0]!] as const,
  );

  let rmsChroma =
    Math.hypot(...sourceColors.map(([, { chroma }]) => chroma)) /
    Math.sqrt(sourceColors.length);

  const palettes = new Map(
    sourceColors.map(([name, { hue }]) => {
      return [name, TonalPalette.fromHueAndChroma(hue, rmsChroma)];
    }),
  );

  const sourceColorHct = Hct.fromInt(options.sourceColors.at(0)!);

  const scheme = new DynamicScheme({
    sourceColorHct,
    variant: options.variant,
    contrastLevel: options.contrastLevel,
    isDark: options.isDark,
    specVersion: "2025",
    platform: "phone",
    errorPalette: palettes.get("red"),
  });

  if (palettes.size === 0) {
    palettes.set("red", scheme.errorPalette);
    rmsChroma = scheme.errorPalette.chroma;
  }

  for (const [name, hue] of Object.entries(centroids)) {
    if (palettes.has(name)) continue;
    palettes.set(name, TonalPalette.fromHueAndChroma(hue, rmsChroma));
  }

  const { colors } = scheme;

  yield ["source", scheme.sourceColorHct.toInt()];

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
    if (!color) continue;
    yield [color.name, color.getArgb(scheme)];
  }

  const background = colors.surface().getHct({
    ...scheme,
    isDark: true,
  } as DynamicScheme);

  yield [
    "black",
    colors.surface().getArgb({
      ...scheme,
      isDark: true,
    } as DynamicScheme),
  ];
  yield [
    "white",
    colors.onSurface().getArgb({
      ...scheme,
      isDark: true,
    } as DynamicScheme),
  ];
  yield ["gray", colors.outline().getArgb(scheme)];
  yield [
    "white_bright",
    colors.inverseSurface().getArgb({
      ...scheme,
      isDark: true,
    } as DynamicScheme),
  ];

  for (const [name, palette] of palettes) {
    for (const color of [
      colors.errorPaletteKeyColor(),
      colors.error(),
      colors.errorDim(),
      colors.onError(),
      colors.errorContainer(),
      colors.onErrorContainer(),
    ]) {
      if (!color) continue;
      yield [
        color.name.replace("error", name),
        color.getArgb({
          ...scheme,
          errorPalette: palette,
        } as DynamicScheme),
      ];
    }
  }
}
