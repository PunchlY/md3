// https://github.com/DenkiYagi/pdf-lib/blob/denkiyagi-fork/src/utils/fast-png-helper.ts

import { convertIndexedToRgb, decode, type DecodedPng, type DecoderInputType } from "fast-png";

function toByte(value: number, depth: number) {
    if (depth === 8)
        return value;
    if (depth === 16)
        return Math.round(value / 257);
    const maxValue = (1 << depth) - 1;
    return Math.round((value * 255) / maxValue);
};

function unpackSamples(image: DecodedPng): Uint8Array | Uint16Array {
    const { data, depth, width, height, channels } = image;
    if (depth === 16) {
        if (data instanceof Uint16Array)
            return data;
        return new Uint16Array(data.buffer, data.byteOffset, data.byteLength / 2);
    }

    if (depth === 8) {
        if (data instanceof Uint8Array)
            return data;
        return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    }

    const raw = data instanceof Uint8Array
        ? data
        : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    const pixelCount = width * height;
    const samplesPerPixel = channels;
    const samplesPerRow = width * samplesPerPixel;
    const samples = new Uint8Array(pixelCount * samplesPerPixel);
    const mask = (1 << depth) - 1;

    let dataIndex = 0;
    let sampleIndex = 0;

    for (let row = 0; row < height; row++) {
        let bitsRemaining = 0;
        let currentByte = 0;

        for (let sample = 0; sample < samplesPerRow; sample++) {
            if (bitsRemaining < depth) {
                currentByte = raw[dataIndex++]!;
                bitsRemaining = 8;
            }

            bitsRemaining -= depth;
            samples[sampleIndex++] = (currentByte >> bitsRemaining) & mask;
        }

        bitsRemaining = 0;
    }

    return samples;
}

export function* rgba(buffer: DecoderInputType): Generator<[red: number, green: number, blue: number, alpha: number]> {
    const image = decode(buffer);
    if (image.palette) {
        if (image.palette.length === 0)
            throw new Error("Indexed PNG is missing a color palette");

        const paletteChannels = image.palette[0]?.length;
        if (paletteChannels !== 3 && paletteChannels !== 4)
            throw new Error(`Unsupported palette channel count: ${paletteChannels}`);

        const paletteData = convertIndexedToRgb(image);
        const pixelCount = image.width * image.height;
        for (let i = 0; i < pixelCount; i++) {
            const paletteOffset = i * paletteChannels;
            const red = paletteData[paletteOffset]!;
            const green = paletteData[paletteOffset + 1]!;
            const blue = paletteData[paletteOffset + 2]!;
            const alpha = paletteChannels === 4
                ? paletteData[paletteOffset + 3]!
                : 255;
            yield [red, green, blue, alpha];
        }
        return;
    }

    const samples = unpackSamples(image);
    const { channels, depth, width, height, transparency } = image;
    const pixelCount = width * height;

    const expectedSamples = pixelCount * channels;
    if (samples.length < expectedSamples)
        throw new Error(`PNG data is truncated (expected at least ${expectedSamples} samples, got ${samples.length})`);

    switch (channels) {
        case 4: {
            for (let i = 0; i < pixelCount; i++) {
                const offset = i * 4;
                const red = toByte(samples[offset]!, depth);
                const green = toByte(samples[offset + 1]!, depth);
                const blue = toByte(samples[offset + 2]!, depth);
                const alpha = toByte(samples[offset + 3]!, depth);
                yield [red, green, blue, alpha];
            }
            break;
        }
        case 3: {
            const transparentColor = transparency && transparency.length >= 3
                ? [
                    toByte(transparency[0]!, depth),
                    toByte(transparency[1]!, depth),
                    toByte(transparency[2]!, depth),
                ]
                : undefined;
            for (let i = 0; i < pixelCount; i++) {
                const offset = i * 3;
                const red = toByte(samples[offset]!, depth);
                const green = toByte(samples[offset + 1]!, depth);
                const blue = toByte(samples[offset + 2]!, depth);
                const alpha = transparentColor && red === transparentColor[0] && green === transparentColor[1] && blue === transparentColor[2]
                    ? 0
                    : 255;
                yield [red, green, blue, alpha];
            }
            break;
        }
        case 2: {
            for (let i = 0; i < pixelCount; i++) {
                const offset = i * 2;
                const gray = toByte(samples[offset]!, depth);
                const alpha = toByte(samples[offset + 1]!, depth);
                yield [gray, gray, gray, alpha];
            }
            break;
        }
        case 1: {
            const transparentSample = transparency && transparency.length > 0
                ? toByte(transparency[0]!, depth)
                : undefined;

            for (let i = 0; i < pixelCount; i++) {
                const gray = toByte(samples[i]!, depth);
                const alpha = transparentSample !== undefined && gray === transparentSample
                    ? 0
                    : 255;

                yield [gray, gray, gray, alpha];
            }
            break;
        }
        default:
            throw new Error(`Unknown channel count: ${channels}`);
    }
}
