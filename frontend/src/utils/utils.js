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

// returns a new object with the values at each key mapped using mapFn(value)
function objectMap(object, mapFn) {
  return Object.keys(object).reduce(function(result, key) {
    result[key] = mapFn(object[key])
    return result
  }, {})
}

const SELECTED_PALETTE = 10;

const categoryNodeColorsStr = [
    // All color palettes from ColorBrewer2 with 5 qualitative colors
    ['#7fc97f','#beaed4','#fdc086','#ffff99','#386cb0'], // 0
    ['#1b9e77','#d95f02','#7570b3','#e7298a','#66a61e'], // 1
    ['#a6cee3','#1f78b4','#b2df8a','#33a02c','#fb9a99'], // 2
    ['#fbb4ae','#b3cde3','#ccebc5','#decbe4','#fed9a6'], // 3
    ['#b3e2cd','#fdcdac','#cbd5e8','#f4cae4','#e6f5c9'], // 4
    ['#e41a1c','#377eb8','#4daf4a','#984ea3','#ff7f00'], // 5
    ['#66c2a5','#fc8d62','#8da0cb','#e78ac3','#a6d854'], // 6
    ['#8dd3c7','#ffffb3','#bebada','#fb8072','#80b1d3'], // 7

    // From Colour Schemes by Paul Tol (https://personal.sron.nl/~pault/data/colourschemes.pdf)
    // bright scheme: [blue, red, green, yellow, cyan]
    ['#4477aa', '#ee6677', '#228833', '#ccbb44', '#66ccee'], // 8
    // bright scheme without red and green and added teal: [blue, yellow, cyan, purple, teal]
    ['#4477aa', '#ccbb44', '#66ccee', '#aa3377', '#009988'], // 9
    // light scheme: [light cyan, mint, pear, light yellow, orange]: better with: darken(0.25)
    ['#99ddff', '#44bb99', '#bbcc33', '#eedd88', '#ee8866'], // 10
]

export const categoryNodeColors = {};
let i = 1;
categoryNodeColorsStr[SELECTED_PALETTE].map(c => Color(c)).forEach(color => {
    categoryNodeColors[i] = color.darken(0.3)
    i += 1;
})

export const categoryHullColors = objectMap(categoryNodeColors, color => color.fade(0.8))
            

export function createArc(x1,y1,x2,y2) {
    return `
    M ${x1} ${y1}
    A 100 100 0 0 0 ${x2} ${y2}
    `
}
export function createLine(x1,y1,x2,y2) {
    return `
    M ${x1} ${y1}
    L ${x2} ${y2}
    `
}

// We should get this from backend. But for now, we hardcode it here.
export const categories = {
	"uniprot": "Proteins or Gene Products",
	"mesh": "Diseases",
	"go": "Biological Process",
	"fplx": "Proteins or Gene Products",
	"pubchem": "Chemicals",
	"interpro": "Proteins or Gene Products",
	"proonto": "Proteins or Gene Products",
	"chebi": "Chemicals",
	"pfam": "Proteins or Gene Products",
	"frailty": "Biological Process",
	"bioprocess": "Biological Process",
	"atcc": "Cells, Organs and Tissues",
	"cellosaurus": "Cells, Organs and Tissues",
	"cl": "Cells, Organs and Tissues",
	"tissuelist": "Cells, Organs and Tissues",
	"uberon": "Cells, Organs and Tissues",
}
export const category_encoding = {
    'Proteins or Gene Products': 1,
    'Diseases': 2,
    'Biological Process': 3,
    'Chemicals': 4,
    "Cells, Organs and Tissues": 5
}

export function getCategoryFromId(id) {
    return category_encoding[categories[id.split(':')[0]]]
}
