import React from 'react';
import * as d3 from "d3";

const BlobLegends = ({ onChangeNodeRadiusScale, onChangeRelationviewShow, onChangeCategoryCount, influenceLinkColors, influenceNodeColors, height }) => {

    const [showRelationViewLegends, setShowRelationViewLegends] = React.useState(false);
    const [colors, setColors] = React.useState([]);


    const [nodeRadiusScaleVals, setNodeRadiusScaleVals] = React.useState({
        minVal: 1,
        maxVal: 2,
        minRadius: 1,
        maxRadius: 2,
        scale: "linear"
    });
    let nodeRadiusScale = null;
    if (nodeRadiusScaleVals.scale === "linear") {
        nodeRadiusScale = d3.scaleLinear()
            .domain([nodeRadiusScaleVals.minVal, nodeRadiusScaleVals.maxVal])
            .range([nodeRadiusScaleVals.minRadius, nodeRadiusScaleVals.maxRadius]);
    }
    else if (nodeRadiusScaleVals.scale === "log") {
        nodeRadiusScale = d3.scaleLog()
            .domain([nodeRadiusScaleVals.minVal, nodeRadiusScaleVals.maxVal])
            .range([nodeRadiusScaleVals.minRadius, nodeRadiusScaleVals.maxRadius]);
    }

    onChangeNodeRadiusScale((newNodeRadiusScale, scale) => {
        setNodeRadiusScaleVals({
            minVal: newNodeRadiusScale.domain()[0],
            maxVal: newNodeRadiusScale.domain()[1],
            minRadius: newNodeRadiusScale.range()[0],
            maxRadius: newNodeRadiusScale.range()[1],
            scale: scale
        });
    });

    onChangeRelationviewShow(setShowRelationViewLegends);
    onChangeCategoryCount(setColors);

    const legendTitleHeight = 20;
    const legendSquareSize = 30;

    const addLegendTitle = (group, legendTitle, legendClass) => {
        group.selectAll("." + legendClass).data([1]).join(
            enter => enter
                .append("text")
                .attr("class", legendClass)
                .text(legendTitle)
                .attr("x", 0)
                .attr("y", 0)
                .attr("text-anchor", "left")
                .style("alignment-baseline", "middle")
                .attr('text-decoration', "underline"),
            update => update
                .text(legendTitle)
                .attr("x", 0)
                .attr("y", 0),
            exit => exit.remove()
        )
    };

    const sizeLegendItemsCount = 3;

    const linspace = (start, stop, num, endpoint = true) => {
        const div = endpoint ? (num - 1) : num;
        const step = (stop - start) / div;
        return Array.from({ length: num }, (_, i) => start + step * i);
    }
    const legendSizeData = Array.from(linspace(nodeRadiusScale.domain()[0], nodeRadiusScale.domain()[1], sizeLegendItemsCount), (d, i) => ({
        id: i, value: d
    }))
    const legendMaxCircleSize = nodeRadiusScale.range()[1];

    React.useEffect(() => {
        if (showRelationViewLegends) {
            const svgDirLegends = d3.select('g.relationlegends');

            addLegendTitle(svgDirLegends, "Influence", "influence");

            svgDirLegends.selectAll('path')
                .data(influenceLinkColors)
                .enter()
                .append('path')
                .attr('d', 'M 2 3 L 5 3 L 6 4 L 5 5 L 2 5 L 1 4 Z')
                .attr('transform', (d, i) => `translate(-35, ${i * (legendSquareSize + 5) + legendTitleHeight - 25}) scale(10)`)
                .attr('fill', d => d.value)

            // svgDirLegends.selectAll('rect')
            //     .data(influenceLinkColors)
            //     .enter()
            //     .append('rect')
            //     .attr('x', 0)
            //     .attr('y', (d, i) => i * (legendSquareSize + 5) + legendTitleHeight)
            //     .attr('width', legendSquareSize)
            //     .attr('height', legendSquareSize)
            //     .style('fill', d => d.value)
            //     .attr("stroke", "black");

            svgDirLegends.selectAll('.colorlabel')
                .data(influenceLinkColors)
                .enter()
                .append("text")
                .attr("class", "colorlabel")
                .attr("x", legendSquareSize * 1.2)
                .attr("y", (d, i) => i * (legendSquareSize + 5) + (legendSquareSize / 2) + legendTitleHeight)
                .style("fill", d => d.value)
                .text(d => d.id)
                .attr("text-anchor", "left")
                .style("alignment-baseline", "middle");
        }
        const svgColorLegends = d3.select('g.categorylegends');
        addLegendTitle(svgColorLegends, "Category Colors", "colorlegendtitle");

        
        const svgCategoryBlobGroup = svgColorLegends.selectAll('g.categoryBlobGroup')
            .data(colors, d => d.encoding)
            .enter()
            .append('g')

        svgCategoryBlobGroup.append('path')
            // https://www.blobmaker.app/
            .attr('d', 'M27.3,-35.1C41.5,-27.3,63.2,-27.5,69.9,-19.7C76.6,-12,68.1,3.7,60,16.6C51.8,29.5,44,39.6,34.1,46.4C24.1,53.2,12.1,56.6,-3.8,61.7C-19.6,66.9,-39.1,73.9,-43.6,65.3C-48.1,56.8,-37.5,32.8,-39.2,15.6C-40.9,-1.6,-54.8,-12,-59.8,-26.5C-64.8,-41.1,-60.9,-59.8,-49.5,-68.6C-38.1,-77.3,-19,-76.1,-6.2,-67.5C6.6,-58.9,13.1,-43,27.3,-35.1Z')
            .attr('fill', d => d.hullColor)
            .attr('transform', (d,i) => 'translate(0,'+ (i * (legendSquareSize + 6) + legendTitleHeight+10) + ') scale(0.3,0.16)')
            .attr('stroke', d => d.hullColor)

        svgCategoryBlobGroup.append('circle')
            .attr('cx', 0)
            .attr('cy', (d, i) => i * (legendSquareSize + 6) + legendTitleHeight + 10)
            .attr('r', legendSquareSize / 4)
            .attr('fill', d => d.nodeColor)


        // svgColorLegends.selectAll('rect')
        //     .data(colors, d => d.encoding)
        //     .enter()
        //     .append('rect')
        //     .attr('x', 0)
        //     .attr('y', (d, i) => i * (legendSquareSize + 5) + legendTitleHeight)
        //     .attr('width', legendSquareSize)
        //     .attr('height', legendSquareSize)
        //     .style('fill', d => d.color)
        //     .attr("stroke", "black");

        svgColorLegends.selectAll('.colorlabel')
            .data(colors)
            .enter()
            .append("text")
            .attr("class", "colorlabel")
            .attr("x", legendSquareSize * 1.2)
            .attr("y", (d, i) => i * (legendSquareSize + 5) + (legendSquareSize / 2) + legendTitleHeight)
            .style("fill", d => d.color)
            .text(d => d.id)
            .attr("text-anchor", "left")
            .style("alignment-baseline", "middle");

        const svgSizeLegends = d3.select('g.sizelegends');
        addLegendTitle(svgSizeLegends, "Weight Values", "radiuslegendtitle");

        svgSizeLegends.selectAll('.circleradiuslabel')
            .data(legendSizeData, d => d.id)
            .join(enter => enter
                .append('circle')
                .attr("class", "circleradiuslabel")
                .attr('cx', 0)
                .attr('cy', (d, i) => i * (legendMaxCircleSize * 2) + legendTitleHeight * 2)
                .attr('r', d => nodeRadiusScale(d.value))
                .style('fill', d => "grey")
                .attr("stroke", "black"),
                update => update
                    .attr('cy', (d, i) => i * (legendMaxCircleSize * 2) + legendTitleHeight * 2)
                    .attr('r', d => nodeRadiusScale(d.value)),
                exit => exit.remove()
            );

        svgSizeLegends.selectAll('.radiuslabel')
            .data(legendSizeData, d => d.id)
            .join(enter => enter
                .append("text")
                .attr("class", "radiuslabel")
                .attr("x", legendMaxCircleSize * 2)
                .attr("y", (d, i) => i * (legendMaxCircleSize * 2) + legendTitleHeight * 2)
                .text(d => Math.round(d.value))
                .attr("text-anchor", "left")
                .style("alignment-baseline", "middle"),
                update => update
                    .attr("y", (d, i) => i * (legendMaxCircleSize * 2) + legendTitleHeight * 2)
                    .text(d => Math.round(d.value)),
                exit => exit.remove()
            );




        return () => {
            d3.select('g.categorylegends').html("");
            d3.select('g.sizelegends').html("");
            d3.select('g.relationlegends').html("");
        }
    });

    return <aside className=" rsection" style={{
        width: "100%",
        height: height,
        position: "relative",
        verticalAlign: "top",
        overflow: "auto",
        backgroundColor: "white"
    }}>
        <svg id="legendgraph" className="fullsize" style={{
            position: "absolute",
            height: "700px"
        }}>
            <g className="legendgroup">
                <g className="categorylegends" transform="translate(50,40)"></g>
                <g className="sizelegends" transform="translate(50,250)"></g>
                <g className="relationlegends" transform="translate(50,500)"></g>
            </g>
        </svg>
    </aside>
}

export default BlobLegends;