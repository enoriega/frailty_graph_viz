import Color from 'color';

export interface Node {
    id: string,
    label: string,
    category: number,
    pinned: boolean,
    degree: number,

    x: number|null,
    y: number|null
}

export interface Link {
    source: string,
    target: string,
    freq: number,
    samecategory: boolean,
}

export type InfluenceColors = {
    id:"Pos"|"Neu"|"Neg",
    value: Color,
}[]
