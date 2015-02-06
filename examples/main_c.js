(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// http://en.wikipedia.org/wiki/Even%E2%80%93odd_rule
// modified from: https://github.com/substack/point-in-polygon/blob/master/index.js
// which was modified from http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

module.exports = function(point, polygon) {
  var polys = polygon.geometry.coordinates;
  var pt = [point.geometry.coordinates[0], point.geometry.coordinates[1]];
  // normalize to multipolygon
  if(polygon.geometry.type === 'Polygon') polys = [polys];

  var insidePoly = false;
  var i = 0;
  while (i < polys.length && !insidePoly) {
    // check if it is in the outer ring first
    if(inRing(pt, polys[i][0])) {
      var inHole = false;
      var k = 1;
      // check for the point in any of the holes
      while(k < polys[i].length && !inHole) {
        if(inRing(pt, polys[i][k])) {
          inHole = true;
        }
        k++;
      }
      if(!inHole) insidePoly = true;
    }
    i++;
  }
  return insidePoly;
}

// pt is [x,y] and ring is [[x,y], [x,y],..]
function inRing (pt, ring) {
  var isInside = false;
  for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    var xi = ring[i][0], yi = ring[i][1];
    var xj = ring[j][0], yj = ring[j][1];

    var intersect = ((yi > pt[1]) != (yj > pt[1]))
        && (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi);
    if (intersect) isInside = !isInside;
  }
  return isInside;
}


},{}],2:[function(require,module,exports){
var random = require('geojson-random');

/**
 * Generates random GeoJSON data, including Points and Polygons, for testing
 * and experimentation.
 *
 * @module turf/random
 * @param {String} [type='point'] type of features desired. Valid values
 * are 'points' or 'polygons'
 * @param {Number} [count=1] how many geometries should be generated.
 * @param {Object} options relevant to the feature desired. Can include:
 * @param {Array<number>} options.bbox a bounding box inside of which geometries
 * are placed. In the case of points, they are guaranteed to be within this bounds,
 * while polygons have their centroid within it.
 * @param {Number} [options.num_ertices=10] the number of vertices added
 * to polygon features.
 * @param {Number} [options.max_radial_length=10] the total number of decimal
 * degrees longitude or latitude that a polygon can extent outwards to
 * from its center.
 * @return {FeatureCollection} generated random features
 * @example
 * var points = turf.random('points', 10);
 * //=points
 */
module.exports = function(type, count, options) {
    options = options || {};
    count = count || 1;
    switch (type) {
        case 'point':
        case 'points':
        case undefined:
            return random.point(count, options.bbox);
        case 'polygon':
        case 'polygons':
            return random.polygon(
                count,
                options.num_vertices,
                options.max_radial_length,
                options.bbox);
        default:
            throw new Error('Unknown type given: valid options are points and polygons');
    }
};

},{"geojson-random":3}],3:[function(require,module,exports){
module.exports = function() {
    throw new Error('call .point() or .polygon() instead');
};

function position(bbox) {
    if (bbox) return coordInBBBOX(bbox);
    else return [lon(), lat()];
}

module.exports.position = position;

module.exports.point = function(count, bbox) {
    var features = [];
    for (i = 0; i < count; i++) {
        features.push(feature(bbox ? point(position(bbox)) : point()));
    }
    return collection(features);
};

module.exports.polygon = function(count, num_vertices, max_radial_length, bbox) {
    if (typeof num_vertices !== 'number') num_vertices = 10;
    if (typeof max_radial_length !== 'number') max_radial_length = 10;
    var features = [];
    for (i = 0; i < count; i++) {
        var vertices = [],
            circle_offsets = Array.apply(null,
                new Array(num_vertices + 1)).map(Math.random);

        circle_offsets.forEach(sumOffsets);
        circle_offsets.forEach(scaleOffsets);
        vertices[vertices.length - 1] = vertices[0]; // close the ring

        // center the polygon around something
        vertices = vertices.map(vertexToCoordinate(position(bbox)));
        features.push(feature(polygon([vertices])));
    }

    function sumOffsets(cur, index, arr) {
        arr[index] = (index > 0) ? cur + arr[index - 1] : cur;
    }

    function scaleOffsets(cur, index) {
        cur = cur * 2 * Math.PI / circle_offsets[circle_offsets.length - 1];
        var radial_scaler = Math.random();
        vertices.push([
            radial_scaler * max_radial_length * Math.sin(cur),
            radial_scaler * max_radial_length * Math.cos(cur)
        ]);
    }

    return collection(features);
};


function vertexToCoordinate(hub) {
    return function(cur, index) { return [cur[0] + hub[0], cur[1] + hub[1]]; };
}

function rnd() { return Math.random() - 0.5; }
function lon() { return rnd() * 360; }
function lat() { return rnd() * 180; }

function point(coordinates) {
    return {
        type: 'Point',
        coordinates: coordinates || [lon(), lat()]
    };
}

function coordInBBBOX(bbox) {
    var lonSpan = bbox[2] - bbox[0],
        latSpan = bbox[3] - bbox[1],
        randInSpan = Math.random() * (lonSpan * latSpan);
    return [
        (bbox[2] === bbox[0]) ? bbox[2] : Math.random() * (lonSpan) + bbox[0],
        (bbox[3] === bbox[1]) ? bbox[1] : Math.random() * (latSpan) + bbox[1]];
}

function pointInBBBOX() {
    return {
        type: 'Point',
        coordinates: [lon(), lat()]
    };
}

function polygon(coordinates) {
    return {
        type: 'Polygon',
        coordinates: coordinates
    };
}

function feature(geom) {
    return {
        type: 'Feature',
        geometry: geom,
        properties: {}
    };
}

function collection(f) {
    return {
        type: 'FeatureCollection',
        features: f
    };
}

},{}],4:[function(require,module,exports){
var inside = require('turf-inside');
var featureCollection = require('turf-featurecollection');

module.exports = function(ptFC, polyFC){
  pointsWithin = featureCollection([]);
  polyFC.features.forEach(function(poly){
    ptFC.features.forEach(function(pt){
      var isInside = inside(pt, poly);
      if(isInside){
        pointsWithin.features.push(pt);
      }
    });
  });
  return pointsWithin;
}
},{"turf-featurecollection":5,"turf-inside":1}],5:[function(require,module,exports){
module.exports = function(features){
  var fc = {
    "type": "FeatureCollection",
    "features": features
  };

  return fc;
}
},{}],6:[function(require,module,exports){
var turf_random = require('turf-random');
var turf_inside = require('turf-inside');
var turf_within = require('turf-within');

// var points = turf_random('points', 1000, {
//       // bbox: [101.61552492, 3.03475392000007, 101.75788386, 3.24671994000005]
//       bbox: [99.63977292, 0.844398000000069, 119.27067984, 7.39229400000005]
//       // bbox: [90, 1, 106, 10]
//     // bbox: [-70, 40, -60, 60]
// });
// L.geoJson(points).addTo(map);
corslite('https://rawgit.com/Tuxuri/gis-data/master/negeri.geojson', function(err, resp) {
    // resp is the XMLHttpRequest object
        var polys = JSON.parse(resp.responseText);
        var poly1 = polys.features[0];
        var pts_a = turf_random('points', 7000, {
            bbox:[99.63977292, 0.844398000000069, 119.27067984, 7.39229400000005]
            });
        pts = turf_within(pts_a, polys);
        var geojsonMarkerOptions = {
            radius: 2,
            fillColor: "#ff7800",
            color: "#000",
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
        };
        pts_g = L.geoJson(pts, {
            pointToLayer: function (feature, latlng) {
                // var myIcon = L.icon({
                //         iconUrl: 'https://mt0.google.com/vt/icon/name=icons/spotlight/park_S_8x.png&scale=2',
                //         iconSize: [16,16] //,
                //         // iconAnchor: [22, 94],
                //         // popupAnchor: [-3, -76],
                //         // shadowUrl: 'images/marker-shadow.png',
                //         // shadowSize: [68, 95],
                //         // shadowAnchor: [22, 94]
                // });

                // return L.marker(latlng, {icon: myIcon});
                return L.circleMarker(latlng, geojsonMarkerOptions);
            }
        });
        pts_g.addTo(map);
        var stats = {};
        for (var i = 0; i < pts.features.length; i++) {
            var pt = pts.features[i];
            for (var j = 0; j < polys.features.length; j++) {
                var p = polys.features[j];
                var name = p.properties.name;
                if (turf_inside(pt, p)) {
                    // console.info('found');
                    if (!stats[name]) {
                        stats[name] = 0;
                    }
                    stats[name] += 1;
                }
            }
        }
        console.debug(stats);

        function style(feature) {
            var col = '#FFFFFF';
            return {color: col};
        }
        var change_style = function(feature){
                // var col = feature.properties.strokecolor;
                var col = '#FFFFFF';
                for (var k in stats) {
                    var val = stats[k];

                    var threshold = parseInt($('#val').val());
                    if (feature.properties.name === k) {
                        if (val <= threshold) {
                            col = toggle ? '#FF0000' : '#00FF00';
                        } else if (val > threshold) {
                            col = toggle ? '#00FF00' : '#FF0000';
                        }
                    }
                }
                return {color: col};
            };
        var g = L.geoJson(polys, {style: change_style});
        var toggle = false;
        $('#btn').on('click', function() {
            g.setStyle(change_style);
            toggle = !toggle;
        });
        $('#val').on('change mousemove', function() {
            // console.debug($(this).val());
            g.setStyle(change_style);
            $('#val_v').text($(this).val());
        });
        g.addTo(map);
        $('#val_v').text($('#val').val());
}, true);
// L.geoJson(points, {
//     style: function (feature) {
//         return {color: feature.properties.color};
//     },
//     onEachFeature: function (feature, layer) {
//         // layer.bindPopup(feature.properties.description);
//     }
// }).addTo(map);



},{"turf-inside":1,"turf-random":2,"turf-within":4}]},{},[6]);
