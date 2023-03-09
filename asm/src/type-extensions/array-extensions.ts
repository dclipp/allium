Array.prototype.last = function (): any {
    if (this.length > 0) {
        return this[this.length - 1];
    } else {
        return undefined;
    }
}

Array.prototype.distinct = function<T> (this: Array<T>, selector?: ((a: T, b: T) => boolean) | string): Array<T> {
    const selectorFn: (a: T, b: T) => boolean = selector === undefined
        ? (a, b) => { return a === b}
        : Object.getOwnPropertyNames(selector).includes('length')
        ? (a, b) => a[selector as string] === b[selector as string]
        : selector as (a: T, b: T) => boolean;
    const distinctArray = new Array<T>();
    this.forEach(x => {
        if (!distinctArray.some(y => selectorFn(x, y))) {
            distinctArray.push(x);
        }
    })
    return distinctArray;
}

Array.prototype.max = function<T> (this: Array<T>, numberSelector: (v: T) => number): T {
    if (this.length > 0) {
        let currentMaxIndex = 0;
        for (let i = 0; i < this.length; i++) {
            const n = numberSelector(this[i]);
            if (n > numberSelector(this[currentMaxIndex])) {
                currentMaxIndex = i;
            }
        }
        return this[currentMaxIndex];
    } else {
        return undefined;
    }
}

Array.prototype.min = function<T> (this: Array<T>, numberSelector: (v: T) => number): T {
    if (this.length > 0) {
        let currentMinIndex = 0;
        for (let i = 0; i < this.length; i++) {
            const n = numberSelector(this[i]);
            if (n < numberSelector(this[currentMinIndex])) {
                currentMinIndex = i;
            }
        }
        return this[currentMinIndex];
    } else {
        return undefined;
    }
}

Array.prototype.groupBy = function<T, U> (this: Array<T>, groupKey: (v: T) => U, keyEquals?: (a: U, b: U) => boolean): Array<{ readonly key: U, values: Array<T> }> {
    const groups = new Array<{ readonly key: U, values: Array<T> }>();
    let _keyEquals = keyEquals || ((a, b) => { return a === b });
    this.forEach(v => {
        const key = groupKey(v);
        const groupIndex = groups.findIndex(g => _keyEquals(g.key, key));
        if (groupIndex > -1) {
            groups[groupIndex].values.push(v);
        } else {
            groups.push({
                key: key,
                values: [v]
            })
        }
    })
    return groups;
}

Array.prototype.findMember = function<T, U> (this: Array<T>, predicate: (value: T, index: number, obj: T[]) => boolean, selector: (v: T) => U, defaultValue?: U): U | undefined {
    let member: U | undefined = undefined;
    const index = this.findIndex(predicate);
    if (index > -1) {
        member = selector(this[index]);
    }
    
    if (member === undefined) {
        return defaultValue;
    } else {
        return member;
    }
}

Array.prototype.insertAt = function<T> (this: Array<T>, item: T, atIndex: number): number {
    if (atIndex === this.length) {
        return this.push(item);
    } else {
        const itemsAfter = this.splice(atIndex);
        this.push(item);
        itemsAfter.forEach(ia => {
            this.push(ia);
        });
        return this.length;
    }
}