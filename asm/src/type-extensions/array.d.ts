declare interface Array<T> {
    last(): T;
    distinct(this: Array<T>, selector?: ((a: T, b: T) => boolean) | string): Array<T>;
    max(this: Array<T>, numberSelector: (v: T) => number): T;
    min(this: Array<T>, numberSelector: (v: T) => number): T;
    groupBy<U>(this: Array<T>, groupKey: (v: T) => U, keyEquals?: (a: U, b: U) => boolean): Array<{ readonly key: U, values: Array<T> }>;
    findMember<U>(this: Array<T>, predicate: (value: T, index: number, obj: T[]) => boolean, selector: (v: T) => U, defaultValue?: U): U | undefined;
    insertAt(this: Array<T>, item: T, atIndex: number): number;
}