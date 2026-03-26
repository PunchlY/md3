import { redFromArgb, greenFromArgb, blueFromArgb, Hct, DynamicColor } from "@material/material-color-utilities";

export type FixedArray<T, N extends number, R extends T[] = []> =
    R['length'] extends N ? R : FixedArray<T, N, [...R, T]>;

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
