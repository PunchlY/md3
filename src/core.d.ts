
interface IteratorConstructor {
    concat<T>(...value: (Iterator<T, unknown, undefined> | Iterable<T, unknown, undefined>)[]): IteratorObject<T, undefined, unknown>;
}
