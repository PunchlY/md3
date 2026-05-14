interface IteratorConstructor {
  concat<T>(
    ...value: (
      | Iterator<T, unknown, undefined>
      | Iterable<T, unknown, undefined>
    )[]
  ): IteratorObject<T, undefined, unknown>;
}

type _FixedArray<
  T,
  N extends number,
  R extends T[] = [],
> = R["length"] extends N ? R : _FixedArray<T, N, [...R, T]>;

type FixedArray<T, N extends number = 1> = _FixedArray<T, N>;
