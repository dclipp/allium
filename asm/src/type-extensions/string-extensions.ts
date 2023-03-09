// String.prototype.preceedingIndexOf = function(this: string, searchString: string, position?: number): number {
//     let indexOfSearchString = -1;
//     const startPosition = position === undefined
//         ? this.length - 1 - searchString.length
//         : position - searchString.length;
//     for (let i = startPosition; i > -1 && indexOfSearchString === -1; i -= searchString.length) {
//         const segment = this.substring(i, Math.min(i + searchString.length, this.length));
//         if (segment === searchString) {
//             indexOfSearchString = i;
//         }
//     }
//     return indexOfSearchString;
// }

// String.prototype.preceedingIndexOfNot = function(this: string, notString: string, position?: number): number {
//     let indexOfNotString = -1;
//     const startPosition = position === undefined
//         ? this.length - 1 - notString.length
//         : position - notString.length;
//     for (let i = startPosition; i > -1 && indexOfNotString === -1; i -= notString.length) {
//         const segment = this.substring(i, Math.min(i + notString.length, this.length));
//         if (segment !== notString) {
//             indexOfNotString = i + notString.length;
//         }
//     }
//     return indexOfNotString;
// }

// String.prototype.indexOfNot = function(this: string, notString: string, position?: number): number {
//     let indexOfNotString = -1;
//     for (let i = position || 0; i < this.length && indexOfNotString === -1; i += notString.length) {
//         const segment = this.substring(i, Math.min(i + notString.length, this.length));
//         if (segment !== notString) {
//             indexOfNotString = i;
//         }
//     }
//     return indexOfNotString;
// }
String.prototype.indexOfNonWhitespace = function (this: string, position?: number): number {
    let indexOfNotString = -1;
    for (let i = position || 0; i < this.length && indexOfNotString === -1; i++) {
        const segment = this.substring(i, Math.min(i + 1, this.length));
        if (segment !== ' ' && segment !== '\t') {
            indexOfNotString = i;
        }
    }
    return indexOfNotString;
}

String.prototype.nthIndexOf = function (this: string, n: number, searchString: string, position?: number): number {
    let matchCount = -1;
    let workingMatchIndex = -1;

    let i = position || 0;
    while (i < this.length && matchCount < n) {
        if (this.substring(i).startsWith(searchString)) {
            matchCount++;
            workingMatchIndex = i;
        }
        i++;
    }

    if (matchCount === n) {
        return workingMatchIndex;
    } else {
        return -1;
    }
}