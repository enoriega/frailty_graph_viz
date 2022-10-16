import Color from "color";
import { InfluenceColors, Point2D } from "./types"

function getEntityCategory(id: string){
    // Just split the grounding id and get the first element as the DB normalizer
    let tokens = id.split(":")
    return tokens[0]
}

// Point/Vector Operations

export function vecFrom(p0: Point2D, p1: Point2D): Point2D {               // Vector from p0 to p1
    return [p1[0] - p0[0], p1[1] - p0[1]];
}

export function vecScale(v: Point2D, scale: number): Point2D {            // Vector v scaled by 'scale'
    return [scale * v[0], scale * v[1]];
}

export function vecSum(pv1: Point2D, pv2: [number,number]): Point2D {              // The sum of two points/vectors
    return [pv1[0] + pv2[0], pv1[1] + pv2[1]];
}

export function vecUnit(v: Point2D): Point2D {                    // Vector with direction of v and length 1
    const norm = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
    return vecScale(v, 1 / norm);
}

export function vecScaleTo(v: Point2D, length: number): Point2D {         // Vector with direction of v with specified length
    return vecScale(vecUnit(v), length);
}

export function unitNormal(pv0: Point2D, p1: null|Point2D): Point2D {           // Unit normal to vector pv0, or line segment from p0 to p1
    if (p1 != null) pv0 = vecFrom(pv0, p1);
    const normalVec: Point2D = [-pv0[1], pv0[0]];
    return vecUnit(normalVec);
};

export const influenceLinkColors: InfluenceColors = [
    { id:"Pos", value: Color("#4bb543")},
    { id:"Neu", value: Color("grey")},
    { id:"Neg", value: Color("#ff8484")},
];

export const influenceNodeColors: InfluenceColors = [
    { id:"Pos", value: Color("#5cc654")},
    { id:"Neu", value: Color("lightgrey")},
    { id:"Neg", value: Color("#ff9595")},
];
