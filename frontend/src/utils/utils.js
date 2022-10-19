import Color from 'color';

export function groupBy(arr, criteria) {
    return arr.reduce(function (acc, currentValue) {
        const group = criteria(currentValue)
        if (!acc[group]) {
            acc[group] = [];
        }
        acc[group].push(currentValue);
        return acc;
    }, {});
}

export function getEntityCategory(id) {
    // Just split the grounding id and get the first element as the DB normalizer
    let tokens = id.split(":")
    return tokens[0]
}


// Point/Vector Operations

export const vecFrom = function (p0, p1) {               // Vector from p0 to p1
    return [p1[0] - p0[0], p1[1] - p0[1]];
}

export const vecScale = function (v, scale) {            // Vector v scaled by 'scale'
    return [scale * v[0], scale * v[1]];
}

export const vecSum = function (pv1, pv2) {              // The sum of two points/vectors
    return [pv1[0] + pv2[0], pv1[1] + pv2[1]];
}

export const vecUnit = function (v) {                    // Vector with direction of v and length 1
    const norm = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
    return vecScale(v, 1 / norm);
}

export const vecScaleTo = function (v, length) {         // Vector with direction of v with specified length
    return vecScale(vecUnit(v), length);
}

export const unitNormal = function (pv0, p1) {           // Unit normal to vector pv0, or line segment from p0 to p1
    if (p1 != null) pv0 = vecFrom(pv0, p1);
    const normalVec = [-pv0[1], pv0[0]];
    return vecUnit(normalVec);
};


export const idToClass = id => {
    if (typeof id === 'string' || id instanceof String) {
        return id.replaceAll(':', '_');
    }
    else {
        return id.id.replaceAll(':', '_');
    }
}

export const normalizeDistance = (x, xMin, xMax, minDist, maxDist) => {
    const dist = xMax + 1 - Math.min(xMax, x);
    return (dist - xMin) / (xMax - xMin) * (maxDist - minDist) + minDist;

}

export const calculateCategoryCenters = (cats, r, width, height) => [...Array(cats).keys()].map(i => [width / 2 + Math.round(r * Math.cos(2 * Math.PI * i / cats)), height / 2 + Math.round(r * Math.sin(2 * Math.PI * i / cats))]);

export const calculateCategoryCentersEllipse = (cats, a, b, width, height) => [...Array(cats).keys()].map(i => {
    const theta = i * Math.PI * 2 / cats;
    const x = width / 2 + ((theta < Math.PI / 2 || theta > Math.PI / 2 * 3) ? 1 : -1) * a * b / (Math.sqrt(b * b + a * a * Math.tan(theta) * Math.tan(theta)));
    const y = height / 2 + (theta < Math.PI ? 1 : -1) * a * b / (Math.sqrt(a * a + b * b / (Math.tan(theta) * Math.tan(theta))))
    return [x, y];
});

// https://colorbrewer2.org/#type=qualitative&scheme=Paired&n=5
const HULL_LIGHTEN_FACTOR = 0.1
export const categoryHullColors1 = {
    1: Color("#a6cee3").lighten(HULL_LIGHTEN_FACTOR),
    2: Color("#1f78b4").lighten(HULL_LIGHTEN_FACTOR),
    3: Color("#b2df8a").lighten(HULL_LIGHTEN_FACTOR),
    4: Color("#33a02c").lighten(HULL_LIGHTEN_FACTOR),
    5: Color("#fb9a99").lighten(HULL_LIGHTEN_FACTOR),
}
// https://colorbrewer2.org/#type=qualitative&scheme=Dark2&n=5
export const categoryHullColors = {
    1: Color("#1b9e77").lighten(HULL_LIGHTEN_FACTOR),
    2: Color("#d95f02").lighten(HULL_LIGHTEN_FACTOR),
    3: Color("#7570b3").lighten(HULL_LIGHTEN_FACTOR),
    4: Color("#e7298a").lighten(HULL_LIGHTEN_FACTOR),
    5: Color("#66a61e").lighten(HULL_LIGHTEN_FACTOR),
}

// returns a new object with the values at each key mapped using mapFn(value)
function objectMap(object, mapFn) {
  return Object.keys(object).reduce(function(result, key) {
    result[key] = mapFn(object[key])
    return result
  }, {})
}

export const categoryNodeColors = objectMap(categoryHullColors, color => color.darken(0.5))
            

export function createArc(x1,y1,x2,y2) {
    return `
    M ${x1} ${y1}
    A 600 600 0 0 0 ${x2} ${y2}
    `
}
export function createLine(x1,y1,x2,y2) {
    return `
    M ${x1} ${y1}
    L ${x2} ${y2}
    `
}