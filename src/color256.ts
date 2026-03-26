import { Cam16, Hct, lerp } from "@material/material-color-utilities";
import type { FixedArray } from "./util";

function lerpArray(t: number, a: FixedArray<number, 3>, b: FixedArray<number, 3>) {
    return a.map((v, i) => lerp(v, b[i]!, t)) as [number, number, number];
}

export function* generateColor256(...colors: number[]) {
    const labs = colors.map((color) => {
        const { jstar, astar, bstar } = Cam16.fromInt(color);
        return [jstar, astar, bstar] as [number, number, number];
    }) as FixedArray<FixedArray<number, 3>, 8>;

    for (let r = 0; r < 6; r++) {
        const c0 = lerpArray(r / 5, labs[0], labs[1]);
        const c1 = lerpArray(r / 5, labs[2], labs[3]);
        const c2 = lerpArray(r / 5, labs[4], labs[5]);
        const c3 = lerpArray(r / 5, labs[6], labs[7]);

        for (let g = 0; g < 6; g++) {
            const c4 = lerpArray(g / 5, c0, c1);
            const c5 = lerpArray(g / 5, c2, c3);

            for (let b = 0; b < 6; b++) {
                const c6 = lerpArray(b / 5, c4, c5);

                yield Cam16.fromUcs(...c6).toInt();
            }
        }
    }

    for (let i = 0; i < 24; i++) {
        const c0 = lerpArray((i + 1) / 25, labs[0], labs[7]);
        yield Cam16.fromUcs(...c0).toInt();
    }
}
