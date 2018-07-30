'use strict';

System.register(['lodash', 'app/core/app_events', './mapper'], function (_export, _context) {
  "use strict";

  var _, appEvents, Mapper;

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

    function y(d, i) {
      return 25 * (i + 1);
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

    function addChordChart(matrix, mmap) {
      if (typeof d3 == 'undefined') return;
      d3.select("#circle").selectAll("*").remove();

      var width = elem.width();
      var height = elem.height();

      // var color = d3.scaleOrdinal(d3[panel.color_scale]);

      var w = width,
          h = height,
          r1 = h / 2,
          r0 = r1 - 110;
      var fill = d3.scale.ordinal().range(['#7a3b2e', '#a79e84', '#bd5734', '#454140', '#f7786b', '#f7cac9', '#034f84', '#92a8d1', '#ada397', '#bdcebe', '#eca1a6', '#d6cbd3', '#ff7b25', '#d64161', '#feb236', '#6b5b95']);
      var chord = d3.layout.chord().padding(.02).sortSubgroups(d3.descending).sortChords(d3.descending);
      var arc = d3.svg.arc().innerRadius(r0).outerRadius(r0 + 20);
      var svg = d3.select(elem[0]).attr("width", w).attr("height", h).append("svg:g").attr("id", "circle").attr("transform", "translate(" + w / 2 + "," + h / 2 + ")");
      svg.append("circle").attr("r", r0 + 20);
      var rdr = Mapper.chordRdr(matrix, mmap);
      chord.matrix(matrix);
      var g = svg.selectAll("g.group").data(chord.groups()).enter().append("svg:g").attr("class", "group").on("mouseover", mouseover).on("mouseout", function (d) {
        d3.select("#tooltip").style("visibility", "hidden");
      });
      g.append("svg:path").style("stroke", "black").style("fill", function (d) {
        return fill(rdr(d).gname);
      }).attr("d", arc);
      g.append("svg:text").each(function (d) {
        d.angle = (d.startAngle + d.endAngle) / 2;
      }).attr("dy", ".35em").style("font-family", "helvetica, arial, sans-serif").style("font-size", "15px").style("fill", "white").attr("text-anchor", function (d) {
        return d.angle > Math.PI ? "end" : null;
      }).attr("transform", function (d) {
        return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")" + "translate(" + (r0 + 26) + ")" + (d.angle > Math.PI ? "rotate(180)" : "");
      }).text(function (d) {
        return rdr(d).gname;
      });
      var chordPaths = svg.selectAll("path.chord").data(chord.chords()).enter().append("svg:path").attr("class", "chord").style("stroke", function (d) {
        return d3.rgb(fill(rdr(d).sname)).darker();
      }).style("fill", function (d) {
        return fill(rdr(d).sname);
      }).attr("d", d3.svg.chord().radius(r0)).on("mouseover", function (d) {
        d3.select("#tooltip").style("visibility", "visible").html(chordTip(rdr(d))).style("top", function () {
          return d3.event.pageY - 170 + "px";
        }).style("left", function () {
          return d3.event.pageX - 100 + "px";
        });
      }).on("mouseout", function (d) {
        d3.select("#tooltip").style("visibility", "hidden");
      });
      function chordTip(d) {
        var p = d3.format(".1%"),
            q = d3.format(",.2f");
        return "Chord Info:<br/>" + d.sname + " imports from " + d.tname + ": $" + q(d.svalue) + "M<br/>" + p(d.svalue / d.stotal) + " of " + d.sname + "'s Total ($" + q(d.stotal) + "M)<br/>" + p(d.svalue / d.mtotal) + " of Matrix Total ($" + q(d.mtotal) + "M)<br/>" + "<br/>" + d.tname + " imports from " + d.sname + ": $" + q(d.tvalue) + "M<br/>" + p(d.tvalue / d.ttotal) + " of " + d.tname + "'s Total ($" + q(d.ttotal) + "M)<br/>" + p(d.tvalue / d.mtotal) + " of Matrix Total ($" + q(d.mtotal) + "M)";
      }
      function groupTip(d) {
        var p = d3.format(".1%"),
            q = d3.format(",.2f");
        return "Group Info:<br/>" + d.gname + " : " + q(d.gvalue) + "M<br/>" + p(d.gvalue / d.mtotal) + " of Matrix Total (" + q(d.mtotal) + "M)";
      }
      function mouseover(d, i) {
        d3.select("#tooltip").style("visibility", "visible").html(groupTip(rdr(d))).style("top", function () {
          return d3.event.pageY - 80 + "px";
        }).style("left", function () {
          return d3.event.pageX - 130 + "px";
        });
        chordPaths.classed("fade", function (p) {
          return p.source.index != i && p.target.index != i;
        });
      }
    }

    function render() {
      data = ctrl.data;
      panel = ctrl.panel;

      if (setElementHeight()) if (ctrl._error || !data || !data.length) {

        showError(ctrl._error || "No data points");

        data = [];
        addChordChart();
      } else {
        d3.csv('/public/plugins/grafana-chord-panel/trade.csv', function (error, csvData) {
          // var csvData = csvData.filter(function(d){ return d.importer1 == "Panama"});
          var mpr = Mapper.chordMpr(csvData);
          mpr.addValuesToMap('importer1').addValuesToMap('importer2').setFilter(function (row, a, b) {
            return row.importer1 === a.name && row.importer2 === b.name || row.importer1 === b.name && row.importer2 === a.name;
          }).setAccessor(function (recs, a, b) {
            if (!recs[0]) return 0;
            return recs[0].importer1 === a.name ? +recs[0].flow1 : +recs[0].flow2;
          });
          addChordChart(mpr.getMatrix(), mpr.getMap());
        });
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
    }, function (_mapper) {
      Mapper = _mapper.default;
    }],
    execute: function () {}
  };
});
//# sourceMappingURL=rendering.js.map
