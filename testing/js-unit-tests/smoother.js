/*jslint unparam: true*/
/*globals describe, it, expect, tangelo */

describe('tangelo.data.smoother', function () {
    'use strict';

    var smoother = tangelo.data.smoother;

    function makeData(n, x, y, xf) {
        var i, data = [], d;
        xf = xf || function (j) {
            return j + Math.random();
        };
        x = x || 'x';
        y = y || 'y';
        data.length = n;
        for (i = 0; i < n; i++) {
            d = {};
            d[x] = xf(i);
            d[y] = Math.random();
            data[i] = d;
        }
        return data;
    }

    describe('edge cases', function () {
        it('empty data', function () {
            expect(smoother({})).toEqual([]);
            expect(smoother({data: []})).toEqual([]);
        });
        it('non positive width', function () {
            var data = makeData(10);
            var values = [];
            data.forEach(function (d) {
                values.push(d.y);
            });
            smoother({
                    data: data,
                    width: -1
            }).forEach(function (d) {
                expect(values.indexOf(d) >= 0).toBe(true);
            });
        });
        it('test in place data mutation', function () {
            var data = makeData(25),
                obj = {};
            smoother({
                data: data,
                set: function (val, d, i) {
                    this[i]._obj1 = obj;
                    d._obj2 = obj;
                }
            });
            data.forEach(function (d) {
                expect(d._obj1).toBe(obj);
                expect(d._obj2).toBe(obj);
            });
        });
        it('test degenerate data', function () {
            var n = 25,
                data = makeData(n, null, null, function () { return 0; }),
                mean = 0,
                values;
            data.forEach(function (d) {
                mean += d.y;
            });
            mean = mean/n;
            values = smoother({
                data: data,
                width: 0
            });
            values.forEach(function (d) {
                expect(Math.abs(d - mean)).toBeLessThan(1e-10);
            });
        });
        it('test sorting', function () {
            var data = makeData(25),
                values = [];
            data.forEach(function (d) {
                values.push(d.y);
            });
            data.reverse();
            expect(smoother({
                data: data,
                sorted: false,
                width: 0
            })).toEqual(values);
        });
    });

    describe('box kernel', function () {
        it('large window', function () {
            var n = 25,
                data = makeData(n),
                mean = 0;
            data.forEach(function (d) {
                mean += d.y;
            });
            mean = mean / n;
            smoother({
                data: data,
                kernel: 'box',
                width: 10
            }).forEach(function (d) {
                expect(Math.abs(d - mean)).toBeLessThan(1e-10);
            });
        });
        it('3 element window', function () {
            var n = 100,
                i,
                data = [];
            for (i = 0; i < n; i += 1) {
                data.push({
                    x: i,
                    y: i
                });
            }
            smoother({
                data: data,
                kernel: 'box',
                width: 1.5,
                absolute: true
            }).forEach(function (d, i) {
                var v;
                if (i === 0) {
                    v = 0.5;
                } else if (i === n - 1) {
                    v = ( 2 * n - 3 ) / 2;
                } else {
                    v = i;
                }
                expect(Math.abs(d - v)/v).toBeLessThan(1e-10);
            });
        });
    });

    describe('gaussian kernel', function () {
        it('large window', function () {
            var n = 25,
                data = makeData(n),
                mean = 0;
            data.forEach(function (d) {
                d.y += 1;
                mean += d.y;
            });
            mean = mean / n;
            smoother({
                data: data,
                kernel: 'gaussian',
                width: 100
            }).forEach(function (d) {
                expect(Math.abs(d - mean)/mean).toBeLessThan(1e-4);
            });
        });
        it('single point', function () {
            var n = 101,
                data = [],
                i,
                sigma = 1,
                c;

            for (i = 0; i < n; i++) {
                data.push({
                    x: i,
                    y: 0
                });
            }
            data[50].y = 1;
            smoother({
                kernel: 'gaussian',
                width: sigma * 3,
                absolute: true,
                data: data,
                set: function (v, d) {
                    d.y = v;
                }
            });
            c = data[50].y;
            data.forEach(function (d, i) {
                var v;
                if (i < 50 - sigma * 3 || i > 50 + sigma * 3) {
                    expect(d.y).toBe(0);
                } else {
                    v = c * Math.exp(-0.5 * (d.x - 50) * (d.x - 50) / (sigma * sigma));
                    expect(Math.abs(v - d.y)/v).toBeLessThan(1e-6);
                }
            });
        });
    });

    describe('custom kernel', function () {
        var width = 5,
            alpha = width/3,
            n = 101,
            data = [],
            i;

        function expKernel(xi, xj) {
            return Math.exp(-alpha * Math.abs(xi - xj));
        }

        for (i = 0; i < n; i += 1) {
            data.push({
                x: i,
                y: 0
            });
        }

        data[50].y = 1;

        smoother({
            kernel: expKernel,
            width: width,
            absolute: true,
            data: data,
            set: function (v, d) {
                d.y = v;
            },
            normalize: false
        });


        data.forEach(function (d, i) {
            var v;
            if (i < 50 - width || i > 50 + width) {
                expect(d.y).toBe(0);
            } else {
                v = expKernel(data[50].x, d.x);
                expect(Math.abs(v - d.y)/v).toBeLessThan(1e-10);
            }
        });
    });

    describe('custom accessors', function () {
        var n = 10,
            data = makeData(n),
            xCount = 0, yCount = 0;

        smoother({
            data: data,
            x: function (d) {
                xCount += 1;
                return d.x;
            },
            y: function (d) {
                yCount += 1;
                return d.y;
            }
        });
        expect(xCount).toBeGreaterThan(n - 1);
        expect(yCount).toBeGreaterThan(n - 1);
    });
});
