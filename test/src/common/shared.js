/**
 * shared
 * Created by cool.blue on 10/04/2017.
 */
export function test(m) {
  return m;
}
export function fmtNow() {
    Number.prototype.fmt = function () {
        return this.toLocaleString('en-AU', {
            minimumIntegerDigits: 8,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })
    };
}
