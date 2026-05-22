// The Radar Chart
// Originally written by Nadieh Bremer | Visual Cinnamon, alangrafu
// Modified by Lucas Jung (@gruvw)
// MIT license

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function RadarChart(id, data, options) {
  var cfg = {
    w: 600,                // width
    h: 600,                // height
    margin: { top: 20, right: 20, bottom: 20, left: 20 }, // svg margins
    levels: 3,             // how many levels or inner circles should there be drawn
    maxValue: 0,           // what is the value that the biggest circle will represent
    labelFactor: 1.25,     // how much farther than the radius of the outer circle should the labels be placed
    wrapWidth: 60,         // the number of pixels after which a label needs to be given a new line
    opacityArea: 0.35,     // the opacity of the area of the blob
    dotRadius: 4,          // the size of the colored circles of each blog
    opacityCircles: 0.1,   // the opacity of the circles of each blob
    strokeWidth: 2,        // the width of the stroke around each blob
    roundStrokes: false,   // if true the area and stroke will follow a round path (cardinal-closed)
    color: [],             // color array
    axisContent: null,     // optional function to render custom HTML for each axis label
    axisLabelFontSize: 10,
    labelFontSize: 12,
    tooltipFontSize: 12
  };

  if ('undefined' !== typeof options) {
    for (var i in options) {
      if ('undefined' !== typeof options[i]) { cfg[i] = options[i]; }
    }
  }

  if (Array.isArray(cfg.color)) {
    var colorArray = cfg.color;
    cfg.color = function(i) {
      return colorArray[i % colorArray.length];
    };
  }

  var container = d3.select(id);

  container.style("position", "relative");
  container.style("font-size", cfg.labelFontSize + "px");

  container.select("svg").remove();
  container.select(".radar-overlay").remove();

  var svg = container.append("svg")
    .attr("width", cfg.w + cfg.margin.left + cfg.margin.right)
    .attr("height", cfg.h + cfg.margin.top + cfg.margin.bottom)
    .attr("class", "radar" + id);

  var overlay = container.append("div")
    .attr("class", "radar-overlay")
    .style("position", "absolute")
    .style("top", "0px")
    .style("left", "0px")
    .style("font-size", cfg.labelFontSize + "px")
    // .style("width", (cfg.w + cfg.margin.left + cfg.margin.right) + "px")
    // .style("height", (cfg.h + cfg.margin.top + cfg.margin.bottom) + "px")
    .style("pointer-events", "none");

  var g = svg.append("g")
    .attr("transform", "translate(" + (cfg.w / 2 + cfg.margin.left) + "," + (cfg.h / 2 + cfg.margin.top) + ")");

  var gridLayer = g.append("g").attr("class", "gridLayer");
  var axisLayer = g.append("g").attr("class", "axisLayer");
  var areaLayer = g.append("g").attr("class", "areaLayer");
  var strokeLayer = g.append("g").attr("class", "strokeLayer");
  var circleLayer = g.append("g").attr("class", "circleLayer");
  var tooltipLayer = g.append("g").attr("class", "tooltipLayer");

  var tooltip = tooltipLayer.append("text")
    .attr("class", "tooltip")
    .style("font-size", cfg.tooltipFontSize + "px")
    .style("opacity", 0);

  function formatTooltipValue(d) {
    if (d.rawValue === undefined || d.rawValue === null) return d3.format('.0%')(d.value);
    var name = d.axisName || "";
    var v = d.rawValue;
    var formatted;
    if (name.includes('%')) {
      formatted = (v * 100).toFixed(1) + '%';
    } else if (name.includes('Salaries')) {
      formatted = '$' + v.toFixed(1) + 'M';
    } else if (Number.isInteger(v) || Math.abs(v - Math.round(v)) < 0.05) {
      formatted = Math.round(v).toString();
    } else {
      formatted = v.toFixed(1);
    }
    return name ? name + ': ' + formatted : formatted;
  }

  function getRadialLine(data, maxValue, radius, angleSlice, rScale) {
    var radarLine = d3.lineRadial()
      .radius(function(d) { return rScale(d.value); })
      .angle(function(d, i) { return i * angleSlice; })
      .curve(d3.curveLinearClosed);

    if (cfg.roundStrokes) {
      radarLine.curve(d3.curveCardinalClosed);
    }
    return radarLine;
  }

  function update(newData, duration, labelOptions) {
    duration = duration || 0;
    var newMaxValue = Math.max(cfg.maxValue, d3.max(newData, function(i) { return d3.max(i.map(function(o) { return o.value; })) }));
    var allAxis = newData[0].map(function(i, j) { return i.axis });
    var total = allAxis.length;
    var radius = Math.min(cfg.w / 2, cfg.h / 2);
    var Format = d3.format('.0%');
    var angleSlice = Math.PI * 2 / total;

    var rScale = d3.scaleLinear()
      .range([0, radius])
      .domain([0, newMaxValue]);

    var radarLine = getRadialLine(newData, newMaxValue, radius, angleSlice, rScale);
    var color = cfg.color;
    // allow to pass per-update colors without rebuilding the whole chart
    if (labelOptions && Array.isArray(labelOptions.colors)) {
      var colorArray = labelOptions.colors;
      color = function(i) {
        return colorArray[i % colorArray.length];
      };
    }

    var axisGrid = gridLayer.selectAll(".axisWrapper").data([null]);
    var axisGridEnter = axisGrid.enter().append("g").attr("class", "axisWrapper");
    var axisGridCombined = axisGrid.merge(axisGridEnter);

    var gridCircles = axisGridCombined.selectAll(".gridCircle")
      .data(d3.range(1, (cfg.levels + 1)).reverse());

    gridCircles.enter()
      .append("circle")
      .attr("class", "gridCircle")
      .attr("r", function(d, i) { return radius / cfg.levels * d; })
      .style("fill", "#CDCDCD")
      .style("stroke", "#CDCDCD")
      .style("fill-opacity", cfg.opacityCircles);

    gridCircles.transition("update").duration(duration)
      .attr("r", function(d, i) { return radius / cfg.levels * d; });

    var axisLabels = axisGridCombined.selectAll(".axisLabel")
      .data(d3.range(1, (cfg.levels + 1)).reverse());

    axisLabels.enter().append("text")
      .attr("class", "axisLabel")
      .attr("x", 4)
      .attr("y", function(d) { return -d * radius / cfg.levels; })
      .attr("dy", "0.4em")
      .style("font-size", cfg.axisLabelFontSize + "px")
      .attr("fill", "#737373");

    axisLabels.transition("update").duration(duration)
      .attr("y", function(d) { return -d * radius / cfg.levels; })
      .text(function(d, i) { return Format(newMaxValue * d / cfg.levels); });

    var axis = axisLayer.selectAll(".axis").data(allAxis);

    axis.exit()
      .transition("update").duration(duration)
      .style("opacity", 0)
      .remove();

    var axisEnter = axis.enter().append("g")
      .attr("class", "axis")
      .style("opacity", 0);

    axisEnter.append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", function(d, i) { return rScale(newMaxValue * 1.1) * Math.cos(angleSlice * i - Math.PI / 2); })
      .attr("y2", function(d, i) { return rScale(newMaxValue * 1.1) * Math.sin(angleSlice * i - Math.PI / 2); })
      .attr("class", "line")
      .style("stroke", "white")
      .style("stroke-width", "2px");

    axis.merge(axisEnter).transition("update").duration(duration)
      .style("opacity", 1);

    var axisCombined = axis.merge(axisEnter);

    axisCombined.select("line")
      .transition("update").duration(duration)
      .attr("x2", function(d, i) { return rScale(newMaxValue * 1.1) * Math.cos(angleSlice * i - Math.PI / 2); })
      .attr("y2", function(d, i) { return rScale(newMaxValue * 1.1) * Math.sin(angleSlice * i - Math.PI / 2); });

    var htmlLabels = overlay.selectAll(".htmlAxisLabel").data(allAxis);

    htmlLabels.exit()
      .transition("update").duration(duration)
      .style("opacity", 0)
      .remove();

    var htmlLabelsEnter = htmlLabels.enter().append("div")
      .attr("class", "htmlAxisLabel")
      .style("position", "absolute")
      .style("text-align", "center")
      .style("font-size", cfg.labelFontSize + "px")
      .style("transform", function(d, i) {
        var angle = angleSlice * i - Math.PI / 2;
        var cosValue = Math.cos(angle);

        var xPerc = -50;
        if (cosValue > 0.1) {
          xPerc = 0;
        } else if (cosValue < -0.1) {
          xPerc = -100;
        }

        return "translate(" + xPerc + "%, -50%)";
      })
      .style("left", function(d, i) {
        var xPos = rScale(newMaxValue * cfg.labelFactor) * Math.cos(angleSlice * i - Math.PI / 2);
        return (cfg.w / 2 + cfg.margin.left + xPos) + "px";
      })
      .style("top", function(d, i) {
        var yPos = rScale(newMaxValue * cfg.labelFactor) * Math.sin(angleSlice * i - Math.PI / 2);
        return (cfg.h / 2 + cfg.margin.top + yPos) + "px";
      })
      .style("pointer-events", "auto")

    var htmlLabelsCombined = htmlLabels.merge(htmlLabelsEnter);

    htmlLabelsCombined.each(function(d, i) {
      var content = cfg.axisContent ? cfg.axisContent(labelOptions, i) : ("<span>" + d + "</span>");
      var nodeContainer = d3.select(this);

      if (content instanceof Node) {
        nodeContainer.html("");
        nodeContainer.node().appendChild(content);
      } else {
        nodeContainer.html(content);
      }
    });

    htmlLabelsCombined.transition("update").duration(duration)
      .style("opacity", 1)
      .style("left", function(d, i) {
        var xPos = rScale(newMaxValue * cfg.labelFactor) * Math.cos(angleSlice * i - Math.PI / 2);
        return (cfg.w / 2 + cfg.margin.left + xPos) + "px";
      })
      .style("top", function(d, i) {
        var yPos = rScale(newMaxValue * cfg.labelFactor) * Math.sin(angleSlice * i - Math.PI / 2);
        return (cfg.h / 2 + cfg.margin.top + yPos) + "px";
      });

    var radarAreas = areaLayer.selectAll(".radarArea").data(newData);

    radarAreas.exit()
      .transition("update").duration(duration)
      .style("opacity", 0)
      .remove();

    var radarAreasEnter = radarAreas.enter().append("path")
      .attr("class", "radarArea")
      .style("opacity", 0)
      .style("fill", function(d, i) { return color(i); })
      .style("fill-opacity", cfg.opacityArea)
      .on('mouseover', function(event, d) {
        areaLayer.selectAll(".radarArea").transition("hover").duration(200).style("fill-opacity", 0.1);
        d3.select(this).transition("hover").duration(200).style("fill-opacity", 0.7);
      })
      .on('mouseout', function() {
        areaLayer.selectAll(".radarArea").transition("hover").duration(200).style("fill-opacity", cfg.opacityArea);
      });

    radarAreas.merge(radarAreasEnter)
      .attr("class", function(d, i) { return "radarArea series-" + i; })
      .transition("update").duration(duration)
      .style("fill", function(d, i) { return color(i); })
      .style("opacity", 1)
      .attr("d", function(d, i) { return radarLine(d); });

    var radarStrokes = strokeLayer.selectAll(".radarStroke").data(newData);

    radarStrokes.exit()
      .transition("update").duration(duration)
      .style("opacity", 0)
      .remove();

    var radarStrokesEnter = radarStrokes.enter().append("path")
      .attr("class", "radarStroke")
      .style("opacity", 0)
      .style("stroke-width", cfg.strokeWidth + "px")
      .style("stroke", function(d, i) { return color(i); })
      .style("fill", "none");

    radarStrokes.merge(radarStrokesEnter)
      .attr("class", function(d, i) { return "radarStroke series-" + i; })
      .transition("update").duration(duration)
      .style("stroke", function(d, i) { return color(i); })
      .style("opacity", 1)
      .attr("d", function(d, i) { return radarLine(d); });

    var radarCircleGroups = circleLayer.selectAll(".radarCircleGroup").data(newData);

    radarCircleGroups.exit()
      .transition("update").duration(duration)
      .style("opacity", 0)
      .remove();

    var radarCircleGroupsEnter = radarCircleGroups.enter().append("g")
      .attr("class", "radarCircleGroup")
      .style("opacity", 0);

    var radarCircleGroupsCombined = radarCircleGroups.merge(radarCircleGroupsEnter);

    radarCircleGroupsCombined.transition("update").duration(duration)
      .style("opacity", 1);

    var radarCircles = radarCircleGroupsCombined.selectAll(".radarCircle")
      .data(function(d, i) {
        return d.map(function(point) {
          return { ...point, parentIndex: i };
        });
      });

    radarCircles.exit().remove();

    var radarCirclesEnter = radarCircles.enter().append("circle")
      .attr("class", "radarCircle")
      .attr("r", cfg.dotRadius)
      .attr("cx", function(d, i) { return rScale(d.value) * Math.cos(angleSlice * i - Math.PI / 2); })
      .attr("cy", function(d, i) { return rScale(d.value) * Math.sin(angleSlice * i - Math.PI / 2); })
      .style("fill", function(d) { return color(d.parentIndex); })
      .style("fill-opacity", 0.8);

    radarCircles.merge(radarCirclesEnter)
      .attr("class", function(d) { return "radarCircle series-" + d.parentIndex; })
      .transition("update").duration(duration)
      .style("fill", function(d) { return color(d.parentIndex); })
      .attr("cx", function(d, i) { return rScale(d.value) * Math.cos(angleSlice * i - Math.PI / 2); })
      .attr("cy", function(d, i) { return rScale(d.value) * Math.sin(angleSlice * i - Math.PI / 2); });

    var blobCircleWrapper = tooltipLayer.selectAll(".radarCircleWrapper").data(newData);

    blobCircleWrapper.exit().remove();

    var blobCircleWrapperEnter = blobCircleWrapper.enter().append("g")
      .attr("class", "radarCircleWrapper");

    var blobCircleWrapperCombined = blobCircleWrapper.merge(blobCircleWrapperEnter);

    // carry the series index into each point so the tooltip can colour-match, without this, `d.parentIndex` is undefined inside the mouseover handler
    var invisibleCircles = blobCircleWrapperCombined.selectAll(".radarInvisibleCircle")
      .data(function(d, i) {
        return d.map(function(point) {
          return { ...point, parentIndex: i };
        });
      });

    invisibleCircles.exit().remove();

    var invisibleCirclesEnter = invisibleCircles.enter().append("circle")
      .attr("class", "radarInvisibleCircle")
      .attr("r", cfg.dotRadius * 1.5)
      .attr("cx", function(d, i) { return rScale(d.value) * Math.cos(angleSlice * i - Math.PI / 2); })
      .attr("cy", function(d, i) { return rScale(d.value) * Math.sin(angleSlice * i - Math.PI / 2); })
      .style("fill", "none")
      .style("pointer-events", "all")
      .on("mouseover", function(event, d) {
        var newX = parseFloat(d3.select(this).attr('cx')) - 10;
        var newY = parseFloat(d3.select(this).attr('cy')) - 10;
        var displayValue = formatTooltipValue(d);
        tooltip.attr('x', newX).attr('y', newY).text(displayValue).transition().duration(200).style('opacity', 1);
      })
      .on("mouseout", function() {
        tooltip.transition().duration(200).style("opacity", 0);
      });

    invisibleCircles.merge(invisibleCirclesEnter)
      .transition("update").duration(duration)
      .attr("cx", function(d, i) { return rScale(d.value) * Math.cos(angleSlice * i - Math.PI / 2); })
      .attr("cy", function(d, i) { return rScale(d.value) * Math.sin(angleSlice * i - Math.PI / 2); })
      .attr("class", function(d) { return "radarInvisibleCircle series-" + d.parentIndex; });
  }

  update(data, 0, options);

  return {
    update: update
  };
}
