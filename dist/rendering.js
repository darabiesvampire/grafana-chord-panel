'use strict';

System.register(['lodash', 'app/core/app_events'], function (_export, _context) {
  "use strict";

  var _, appEvents;

  function link(scope, elem, attrs, ctrl) {

    function emit(field, value) {
      appEvents.emit('add-selection', {
        field: field,
        value: value
      });
    }

    var data, panel, svgWrapper, highlight_text;
    var tooltipEle = elem.find('.tooltip');
    var captionEle = elem.find('.caption');

    var theme = grafanaBootData.user.lightTheme ? '-light' : '-dark';

    elem = elem.find('.networkchart-panel');

    ctrl.events.on('render', function () {
      render();
    });

    function setElementHeight() {
      try {
        var height = ctrl.height || panel.height || ctrl.row.height;
        if (_.isString(height)) {
          height = parseInt(height.replace('px', ''), 10);
        }

        height -= 5; // padding
        height -= panel.title ? 24 : 9; // subtract panel title bar

        elem.css('height', height + 'px');

        return true;
      } catch (e) {
        // IE throws errors sometimes
        return false;
      }
    }

    function showError(errorText) {
      var noData = elem.find(".no-data");
      if (errorText) {
        noData.text(errorText);
        noData.show();
      } else noData.hide();
    }

    function addZoom(svg) {
      svgWrapper = svg.select('.svg-wrapper');

      svg.call(d3.zoom().on('zoom', function () {

        var scale = d3.event.transform.k,
            translate = [d3.event.transform.x, d3.event.transform.y];

        svgWrapper.attr('transform', 'translate(' + translate[0] + ', ' + translate[1] + ') scale(' + scale + ')');
      }));
    }

    function y(d, i) {
      return 25 * (i + 1);
    }

    function y_plus_5(d, i) {
      return y(d, i) + 5;
    }

    function y_minus_5(d, i) {
      return y(d, i) - 5;
    }

    var tooltipEvals = [];

    function parseTooltip(tooltip, columnTexts) {
      var regExp = /{{(.*?)}}/g;
      var tooltipEval = ctrl.$sanitize(tooltip);
      var match;
      do {
        match = regExp.exec(tooltip);
        if (match) {
          var index = columnTexts.indexOf(match[1]);
          var replaceWith = index !== -1 ? 'd[' + index + ']' : "";

          tooltipEval = tooltipEval.replace(match[1], replaceWith);
        }
      } while (match);

      return tooltipEval;
    }

    function createTooltipEvals(columnTexts) {

      var firstTooltip = panel.first_term_tooltip;

      var tooltipEvalText1 = firstTooltip && columnTexts && columnTexts.length ? parseTooltip(firstTooltip, columnTexts) : "{{d[0]}}";
      tooltipEvals[0] = ctrl.$interpolate(tooltipEvalText1);

      var secondTooltip = panel.second_term_tooltip;

      var tooltipEvalText2 = secondTooltip && columnTexts && columnTexts.length ? parseTooltip(secondTooltip, columnTexts) : "{{d[1]}}";
      tooltipEvals[1] = ctrl.$interpolate(tooltipEvalText2);
    }

    function combineFieldIndex(columnTexts) {
      if (panel.combine_to_show) {
        var showWhichIndex = columnTexts.indexOf(panel.combine_to_show);

        if (showWhichIndex !== -1) return showWhichIndex;
      }

      return 0;
    }

    function addNetworkChart() {
      if (typeof d3 == 'undefined') return;

      var width = elem.width();
      var height = elem.height();

      var color = d3.scaleOrdinal(d3[panel.color_scale]);

      var noise = panel.remove_noise ? panel.noise : 3;
      var nodes_noise = panel.nodes_remove_noise ? panel.nodes_noise : 0;

      var noiseMin = 0;
      var noiseMax = 0;
      var isNoiseRange = false;

      var noiseArray = noise.toString().split('-');
      if (noiseArray.length === 2) {
        isNoiseRange = true;
        noiseMin = noiseArray[0];
        noiseMax = noiseArray[1];
      }

      var nodeNoiseMin = 0;
      var nodeNoiseMax = 0;
      var isNodeNoiseRange = false;

      if (nodes_noise) {
        var edgeNoiseArray = nodes_noise.toString().split('-');
        if (edgeNoiseArray.length === 2) {
          isNodeNoiseRange = true;
          nodeNoiseMin = edgeNoiseArray[0];
          nodeNoiseMax = edgeNoiseArray[1];
        }
      }

      var filter_first_link_numbers = panel.first_filter_minumum_number_of_links ? panel.first_filter_minumum_number_of_links : 0;
      var filter_second_link_numbers = panel.second_filter_minumum_number_of_links ? panel.second_filter_minumum_number_of_links : 0;

      //************************ Init Caption and Colors Data *************************/
      var colorSelections = {};
      var columns = [];
      var columnTexts = _.map(ctrl.columns, "text");

      var default_index1;
      var color_regexp1;
      var color_data_index1 = null;

      var default_index2;
      var color_regexp2;
      var color_data_index2 = null;

      var selector = panel.first_color_selector;
      if (selector === 'index') {
        if (!panel.combine_active || combineFieldIndex(columnTexts) === 0) {
          default_index1 = columns.length;

          ctrl.columns[0].group = 0;
          columns.push(ctrl.columns[0]);
        }
      } else if (selector === 'regular expression') color_regexp1 = new RegExp(panel.first_color_regexp);else color_data_index1 = columnTexts.indexOf(selector);

      selector = panel.second_color_selector;
      if (selector === 'index') {
        if (!panel.combine_active || combineFieldIndex(columnTexts) === 1) {
          default_index2 = columns.length;

          ctrl.columns[1].group = 1;
          columns.push(ctrl.columns[1]);
        }
      } else if (selector === 'regular expression') color_regexp2 = new RegExp(panel.second_color_regexp);else color_data_index2 = columnTexts.indexOf(selector);

      //************************ Tooltips *************************/

      createTooltipEvals(columnTexts);

      var tooltip = d3.select(tooltipEle[0]).style("opacity", 0);

      function showTooltip(d) {
        tooltip.transition().duration(200).style("opacity", .8);

        tooltip.html(d.tooltip).style("width", d.tooltip.length * 7 + "px").style("left", d3.event.pageX + "px").style("top", d3.event.pageY - 28 + "px");
      }

      function hideTooltip(d) {
        tooltip.transition().duration(500).style("opacity", 0);
      }

      //************************ Main Graph *************************/

      var svg = d3.select(elem[0]);

      addZoom(svg);

      //************************ Links between nodes *************************/

      var totals = {};
      var linkData = [];
      var nodesData = [];
      var nodesData2 = []; //Second group nodes

      var doWeFilterOnEdgeCounts = filter_first_link_numbers || filter_second_link_numbers;

      if (panel.combine_active) {
        var sourceIndex = combineFieldIndex(columnTexts);
        var targetIndex = +!sourceIndex; // 0 -> 1     1,2,... => 0

        var allSources = {};
        var allTargets = {};
        var totalsFilterHash = {};

        _.forEach(data, function (d) {

          var value = d[d.length - 1];
          //No value
          if (!isNoiseRange) {
            if (!value || value < noise) {
              return;
            }
          }
          if (isNoiseRange) {
            if (!value || value < noiseMin || value > noiseMax) {
              return;
            }
          }
          var source = d[sourceIndex];
          var target = d[targetIndex];

          initHash(allSources, source);
          initHash(allTargets, target);

          allSources[source][target] = value;
          allTargets[target][source] = value;

          allSources[source].tooltip = tooltipEvals[sourceIndex]({ d: d });

          if (color_data_index1 !== null || color_regexp1) allSources[source].group = getGroup(d, sourceIndex);

          if (doWeFilterOnEdgeCounts) {
            setTotalsHash(totalsFilterHash, source, value);
            setTotalsHash(totalsFilterHash, target, value);
          }
        });

        var combineMethod = _[panel.combine_method];

        var relations = {};

        for (var source in allSources) {

          initHash(relations, source);
          var currentRel = relations[source];

          for (var target in allSources[source]) {
            if (target === 'group' || target === 'tooltip') continue;

            if (doWeFilterOnEdgeCounts && (totalsFilterHash[source].count < filter_first_link_numbers || totalsFilterHash[target].count < filter_second_link_numbers)) {
              continue;
            }

            var value = allSources[source][target];

            for (var sourceFromTarget in allTargets[target]) {

              //Already calculated at the other end
              if (relations[sourceFromTarget]) continue;

              if (panel.hide_internal_relationships && allSources[source].group === allSources[sourceFromTarget].group) continue;

              if (!currentRel[sourceFromTarget]) currentRel[sourceFromTarget] = 0;

              var param = [value, allTargets[target][sourceFromTarget]];
              currentRel[sourceFromTarget] += combineMethod(param);
            }
          }
        }

        for (var relation1 in relations) {
          for (var relation2 in relations[relation1]) {

            var value = relations[relation1][relation2];

            setTotalsHash(totals, relation1, value);
            setTotalsHash(totals, relation2, value);
          }
        }

        for (var relation1 in relations) {
          for (var relation2 in relations[relation1]) {
            var addFirst = totals[relation1].value > nodes_noise;
            if (isNodeNoiseRange) addFirst = totals[relation1].value > nodeNoiseMin && totals[relation1].value < nodeNoiseMax;

            var addSecond = totals[relation2].value > nodes_noise;
            if (isNodeNoiseRange) addSecond = totals[relation2].value > nodeNoiseMin && totals[relation2].value < nodeNoiseMax;

            if (!addFirst && !addSecond) continue;

            nodesData.push({
              id: relation1,
              group: allSources[relation1].group,
              tooltip: allSources[relation1].tooltip + getTotalTooltip(relation1)
            });

            nodesData.push({
              id: relation2,
              group: allSources[relation2].group,
              tooltip: allSources[relation2].tooltip + getTotalTooltip(relation2)
            });

            var value = relations[relation1][relation2];

            linkData.push({
              id: relation1 + relation2,
              source: relation1,
              target: relation2,
              value: value,
              tooltip: relation1 + ' <=> ' + relation2 + '<br>' + value
            });
          }
        }
      } else {
        _.forEach(data, function (d) {
          var value = d[d.length - 1];

          if (!isNoiseRange) {
            if (!value || value < noise) {
              return;
            }
          }
          if (isNoiseRange) {
            if (!value || value < noiseMin || value > noiseMax) {
              return;
            }
          }

          setTotalsHash(totals, d[0], value);
          setTotalsHash(totals, d[1], value);
        });

        _.forEach(data, function (d) {
          var value = d[d.length - 1];

          if (!isNoiseRange) {
            if (!value || value < noise) {
              return;
            }
          }
          if (isNoiseRange) {
            if (!value || value < noiseMin || value > noiseMax) {
              return;
            }
          }

          var firstNode = d[0];
          var secondNode = d[1];

          if (nodes_noise) {
            var addFirst = totals[firstNode].value > nodes_noise;
            if (isNodeNoiseRange) addFirst = totals[firstNode].value > nodeNoiseMin && totals[firstNode].value < nodeNoiseMax;

            var addSecond = totals[secondNode].value > nodes_noise;
            if (isNodeNoiseRange) addSecond = totals[secondNode].value > nodeNoiseMin && totals[secondNode].value < nodeNoiseMax;

            if (!addFirst && !addSecond) return;
          }

          //Should I decrement the second link number count when first is omited or vice versa
          if (totals[firstNode].count < filter_first_link_numbers || totals[secondNode].count < filter_second_link_numbers) {
            return;
          }

          linkData.push({
            id: firstNode + secondNode,
            source: firstNode,
            target: secondNode,
            value: value,
            tooltip: firstNode + " <=> " + secondNode + " <br> " + value
          });

          nodesData.push({
            id: firstNode,
            group: getGroup(d, 0),
            tooltip: tooltipEvals[0]({ d: d }) + getTotalTooltip(firstNode)
          }); //columns[i].text

          nodesData2.push({
            id: secondNode,
            group: getGroup(d, 1),
            tooltip: tooltipEvals[1]({ d: d }) + getTotalTooltip(secondNode)
          }); //columns[i].text
        });
      }

      nodesData = _.uniqBy(nodesData, function (d) {
        return d.id;
      });
      nodesData2 = _.uniqBy(nodesData2, function (d) {
        return d.id;
      });

      //************************ Links d3 *************************/


      var linkUpdate = svg.select(".links").selectAll("line").data(linkData, function (d) {
        return d.id;
      });

      // EXIT
      // Remove old elements as needed.
      linkUpdate.exit().remove();

      // ENTER
      // Create new elements as needed.  
      var enter = linkUpdate.enter().append("line").attr("class", "line" + theme).on("mouseover", showTooltip).on("mouseout", hideTooltip);

      /*
      enter    
        .append("title")
        .text(d => d.id)
      */

      var link_thickness = panel.link_thickness;

      if (panel.dynamic_thickness) link_thickness = function link_thickness(d) {
        return Math.log(d.value);
      };

      // ENTER + UPDATE
      linkUpdate = linkUpdate.merge(enter)
      //.selectAll("line")
      .attr("stroke-width", link_thickness);

      var maxValueLogged = _.reduce(linkData, function (max, d) {
        var log = Math.log(d.value);
        if (log > max) return log;

        return max;
      }, 0);

      //************************ NODES d3 *************************/

      //************************ Circles d3 *************************/

      var radius = panel.node_radius;

      var circleUpdate = svg.select(".nodes").selectAll('circle').data(nodesData, function (d) {
        return d.id + '-node';
      });

      // EXIT
      // Remove old elements as needed.
      circleUpdate.exit().remove();

      // ENTER
      // Create new elements as needed.  
      var circleEnter = circleUpdate.enter().append("circle").on("mouseover", showTooltip).on("mouseout", hideTooltip).on("click", clicked).call(d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended));

      /*                    
      circleEnter   
          .append("title")
          .text(d => d.id);
      */

      // ENTER + UPDATE
      circleUpdate = circleUpdate.merge(circleEnter)
      //.selectAll("circle")
      .attr("r", radius) // TODO use cummulative value for this
      .attr("fill", function (d) {
        return d.group ? color(d.group) : color(0);
      });

      //************************ Rectangles d3 *************************/


      var squareSide = panel.square_side_length;

      var rectUpdate = svg.select(".nodes").selectAll('rect').data(nodesData2, function (d) {
        return d.id + '-node';
      });

      // EXIT
      // Remove old elements as needed.
      rectUpdate.exit().remove();

      // ENTER
      // Create new elements as needed.  
      var rectEnter = rectUpdate.enter().append("rect").on("mouseover", showTooltip).on("mouseout", hideTooltip).on("click", clicked).call(d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended));

      // ENTER + UPDATE
      rectUpdate = rectUpdate.merge(rectEnter).attr("x", -squareSide / 2).attr("y", -squareSide / 2).attr("width", squareSide).attr("height", squareSide).attr("fill", function (d) {
        return d.group ? color(d.group) : color(0);
      });

      var distance = panel.link_distance || 20;

      var simulation = d3.forceSimulation().force("link", d3.forceLink().id(function (d) {
        return d.id;
      }).distance(distance).strength(function (d) {

        if (!d.value) return 0.01;

        var strength = Math.log(d.value) / maxValueLogged;
        if (strength < 0.01) return 0.01;

        return strength;
      })).force("charge", d3.forceManyBody()).force("center", d3.forceCenter(width / 2, height / 2));

      simulation.nodes(nodesData.concat(nodesData2)).on("tick", ticked);

      simulation.force("link").links(linkData);

      //************************ Add Caption Colors *************************/
      var captions = d3.select(captionEle[0]);

      /*
      var columnsSorted = columns;
      var secondColumsSorted;
       if(!panel.combine_active)
      {
        columnsSorted = _.filter(columns, ['group', 0 ]);
        secondColumsSorted = _.filter(columns, 'group');
      }
       columnsSorted = _.sortBy(columnsSorted,"text")
       if(secondColumsSorted)
        secondColumsSorted = _.sortBy(secondColumsSorted,"text")
       */

      captions.attr("height", y(null, columns.length));

      var columnsSorted = _.sortBy(columns, ["group", "text"]);

      var captionsUpdate = captions.selectAll("g").data(columnsSorted, function (d, i) {
        return d.text + i;
      });

      // EXIT
      // Remove old elements as needed.
      captionsUpdate.exit().remove();

      // ENTER
      // Create new elements as needed.  
      var captionsEnter = captionsUpdate.enter().append("g");

      captionsEnter.append("text").attr("class", "captions-text" + theme).attr("x", 25).attr("y", y_plus_5);

      var captionsMerged = captionsUpdate.merge(captionsEnter);

      captionsMerged.selectAll('text').text(function (d) {
        return d.text;
      });

      if (panel.combine_active) captionsMerged.append("circle");else {

        captionsMerged.append(function (d) {
          var ele = d.group === 0 ? "circle" : "rect";
          return d3.creator(ele).apply(this);
        });
      }

      var colorTexts = _.map(columns, "text");
      var columnsSortedTexts = _.map(columnsSorted, "text");

      // ENTER + UPDATE
      captionsMerged.selectAll('circle').attr("r", 7).attr("cx", 15).attr("cy", function (d) {
        return 25 * (columnsSortedTexts.indexOf(d.text) + 1);
      }).attr("fill", function (d) {
        return color(colorTexts.indexOf(d.text));
      });

      captionsMerged.selectAll('rect').attr("x", 10).attr("y", function (d) {
        return 25 * (columnsSortedTexts.indexOf(d.text) + 1) - 5;
      }).attr("width", 10).attr("height", 10).attr("fill", function (d) {
        return color(colorTexts.indexOf(d.text));
      });

      function checkHighlight(d) {
        return d.tooltip.toLowerCase().indexOf(highlight_text) !== -1;
      }

      if (ctrl.highlight_text) {

        highlight_text = ctrl.highlight_text.toLowerCase();

        //stop simiulation
        simulation.alphaTarget(0);

        circleUpdate.transition().duration(1000).delay(2000).attr("r", function (d) {
          return checkHighlight(d) ? radius * 7 : radius;
        }).attr("stroke", function (d) {
          return checkHighlight(d) ? "lightblue" : "";
        }).attr("stroke-width", function (d) {
          return checkHighlight(d) ? 2 : "";
        }).transition().duration(1000).delay(1000).attr("r", radius);

        rectUpdate.transition().duration(1000).delay(2000).attr("width", function (d) {
          return checkHighlight(d) ? squareSide * 7 : squareSide;
        }).attr("height", function (d) {
          return checkHighlight(d) ? squareSide * 7 : squareSide;
        }).attr("stroke", function (d) {
          return checkHighlight(d) ? "lightblue" : "";
        }).attr("stroke-width", function (d) {
          return checkHighlight(d) ? 2 : "";
        }).transition().duration(1000).delay(1000).attr("width", squareSide).attr("height", squareSide);
      } else if (ctrl.prev_highlight_text) {
        circleUpdate.attr("stroke", "").attr("stroke-width", "");

        rectUpdate.attr("stroke", "").attr("stroke-width", "");
      }

      function ticked() {
        linkUpdate.attr("x1", function (d) {
          return d.source.x;
        }).attr("y1", function (d) {
          return d.source.y;
        }).attr("x2", function (d) {
          return d.target.x;
        }).attr("y2", function (d) {
          return d.target.y;
        });

        function transformXY(d) {
          return "translate(" + d.x + "," + d.y + ")";
        }

        //circleUpdate.attr("transform", transformXY);
        circleUpdate.attr("cx", function (d) {
          return d.x;
        }).attr("cy", function (d) {
          return d.y;
        });

        rectUpdate.attr("transform", transformXY);
      }

      function dragstarted(d) {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }

      function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
      }

      function clicked(d, i) {
        if (!d3.event || !d3.event.shiftKey) return;

        var field;
        if (panel.combine_active) {
          field = panel.combine_to_show;
        } else {
          var index = this.nodeName === "circle" ? 0 : 1;

          var field = columnTexts[index];
        }

        emit(field, d.id);

        d3.event.stopPropagation();
      }

      function dragended(d) {
        if (!d3.event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }

      function initHash(hash, key) {
        if (!hash[key]) {
          hash[key] = {};
          return true;
        }

        return false;
      }

      function setTotalsHash(hash, key, value) {
        if (initHash(hash, key)) {
          hash[key].count = 0;
          hash[key].value = 0;
        }
        hash[key].value += value;
        hash[key].count++;
      }

      function getGroup(d, index) {
        var group;
        var default_index = index === 0 ? default_index1 : default_index2;
        var selector = index === 0 ? color_data_index1 : color_data_index2;
        var regExp = index === 0 ? color_regexp1 : color_regexp2;

        var selectorData;

        if (selector !== null) selectorData = d[selector];

        if (regExp) {
          var result = regExp.exec(d[index]);

          if (result && result.length) selectorData = result[result.length - 1];
        }

        if (selectorData) {
          group = colorSelections[selectorData];
          if (group === undefined) {
            group = colorSelections[selectorData] = columns.length;
            columns.push({
              text: selectorData,
              group: index
            });
          }
        } else group = default_index;

        return group;
      }

      function getTotalTooltip(key) {
        var totalObj = totals[key];
        return "<br/> Total:" + totalObj.value + "&nbsp;&nbsp; Edge Count:" + totalObj.count;
      }
    }

    function render() {
      data = ctrl.data;
      panel = ctrl.panel;

      if (setElementHeight()) if (ctrl._error || !data || !data.length) {

        showError(ctrl._error || "No data points");

        data = [];
        addNetworkChart();
      } else {
        addNetworkChart();
        showError(false);
      }

      ctrl.renderingCompleted();
    }
  }

  _export('default', link);

  return {
    setters: [function (_lodash) {
      _ = _lodash.default;
    }, function (_appCoreApp_events) {
      appEvents = _appCoreApp_events.default;
    }],
    execute: function () {}
  };
});
//# sourceMappingURL=rendering.js.map
