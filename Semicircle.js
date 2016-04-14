/**
 * Semicircle extension for L.Circle.
 * Jan Pieter Waagmeester <jieter@jieter.nl>
 *
 * This version is tested with leaflet 1.0.0-beta.2
 */
(function (factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define(['leaflet'], factory);
    } else if (typeof module !== 'undefined') {
        // Node/CommonJS
        module.exports = factory(require('leaflet'));
    } else {
        // Browser globals
        if (typeof window.L === 'undefined') {
            throw 'Leaflet must be loaded first';
        }
        factory(window.L);
    }
})(function (L) {

    var DEG_TO_RAD = Math.PI / 180;

    // make sure 0 degrees is up (North) and convert to radians.
    function fixAngle (angle) {
        return (angle - 90) * DEG_TO_RAD;
    }

    // rotate point [x + r, y+r] around [x, y] with `angle`.
    function rotated (point, angle, r) {
        return point.add(
            L.point(Math.cos(angle), Math.sin(angle)).multiplyBy(r)
        ).round();
    }

    L.Point.prototype.rotated = function (angle, r) {
        return rotated(this, angle, r);
    };

    L.Circle = L.Circle.extend({
        options: {
            startAngle: 0,
            stopAngle: 359.9999
        },

        startAngle: function () {
            if (this.options.startAngle < this.options.stopAngle) {
                return fixAngle(this.options.startAngle);
            } else {
                return fixAngle(this.options.stopAngle);
            }
        },
        stopAngle: function () {
            if (this.options.startAngle < this.options.stopAngle) {
                return fixAngle(this.options.stopAngle);
            } else {
                return fixAngle(this.options.startAngle);
            }
        },

        setStartAngle: function (angle) {
            this.options.startAngle = angle;
            return this.redraw();
        },

        setStopAngle: function (angle) {
            this.options.stopAngle = angle;
            return this.redraw();
        },

        setDirection: function (direction, degrees) {
            if (degrees === undefined) {
                degrees = 10;
            }
            this.options.startAngle = direction - (degrees / 2);
            this.options.stopAngle = direction + (degrees / 2);

            return this.redraw();
        }
    });

    var _updateCircleSVG = L.SVG.prototype._updateCircle;
    var _updateCircleCanvas = L.Canvas.prototype._updateCircle;

    L.SVG.include({
        _updateCircle: function (layer) {
            // If we want a circle, we use the original function
            if (layer.options.startAngle === 0 && layer.options.stopAngle > 359) {
                return _updateCircleSVG.call(this, layer);
            }
            if (layer._empty()) {
                return this._setPath(layer, 'M0 0');
            }

            var p = layer._point,
                r = layer._radius,
                r2 = Math.round(layer._radiusY || r),
                start = p.rotated(layer.startAngle(), r),
                end = p.rotated(layer.stopAngle(), r);

            var largeArc = (layer.options.stopAngle - layer.options.startAngle >= 180) ? '1' : '0';

            var d = 'M' + p.x + ',' + p.y +
                // line to first start point
                'L' + start.x + ',' + start.y +
                'A ' + r + ',' + r2 + ',0,' + largeArc + ',1,' + end.x + ',' + end.y +
                ' z';

            this._setPath(layer, d);
        }
    });

    L.Canvas.include({
        _updateCircle: function (layer) {
            // If we want a circle, we use the original function
            if (layer.options.startAngle === 0 && layer.options.stopAngle > 359) {
                return _updateCircleCanvas.call(this, layer);
            }

            var p = layer._point,
                ctx = this._ctx,
                r = layer._radius,
                s = (layer._radiusY || r) / r,
                start = p.rotated(layer.startAngle(), r),
                end = p.rotated(layer.stopAngle(), r);

            this._drawnLayers[layer._leaflet_id] = layer;

            if (s !== 1) {
                ctx.save();
                ctx.scale(1, s);
            }

            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(start.x, start.y);
            ctx.arc(p.x, p.y, r, layer.startAngle(), layer.stopAngle());
            ctx.lineTo(p.x, p.y);

            // ctx.arc(p.x, p.y / s, r, 0, Math.PI * 2, false);

            if (s !== 1) {
                ctx.restore();
            }

            this._fillStroke(ctx, layer);
        }
    });
});
