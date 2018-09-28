import _ from 'lodash';
import appEvents from 'app/core/app_events';
import Mapper from './mapper'

export default function link(scope, elem, attrs, ctrl) {

  function emit(field, value) {
    appEvents.emit('add-selection', {
      field: field,
      value: value
    });
  }



  var data,panel, svgWrapper, highlight_text ;
  var tooltipEle = elem.find('.tooltip');
  var captionEle = elem.find('.caption');

  var theme = grafanaBootData.user.lightTheme ? '-light' : '-dark' ;

  // elem = elem.find('.networkchart-panel');

  var $panelContainer = elem.find('.panel-container');

  ctrl.events.on('render', function() {
    render();
  });
  data = ctrl.data;
  panel = ctrl.panel;

  var gaugeByClass = elem.find('.grafana-d3-chord');
  //gaugeByClass.append('<center><div id="'+ctrl.containerDivId+'"></div></center>');
  gaugeByClass.append('<div id="'+ctrl.containerDivId+'"></div>');
  var container = gaugeByClass[0].childNodes[0];
  ctrl.setContainer(container);
  if ($('#'+panel.chordDivId).length) {
    $('#'+panel.chordDivId).remove();
  }

  function setElementHeight() {
    try {
      var height = ctrl.height || panel.height || ctrl.row.height;
      if (_.isString(height)) {
        height = parseInt(height.replace('px', ''), 10);
      }

      height -= 5; // padding
      height -= panel.title ? 24 : 9; // subtract panel title ş

      elem.css('height', height + 'px');

      return true;
    } catch(e) { // IE throws errors sometimes
      return false;
    }
  }


  function showError(errorText) {
    var noData = elem.find(".no-data");
    if(errorText){
      noData.text(errorText);
      noData.show();
    }
    else
      noData.hide();
  }


  function y(d,i){
    return 25 * (i+1)
  }


  var tooltipEvals = [];

  function parseTooltip(tooltip,columnTexts){
    var regExp=/{{(.*?)}}/g;
    var tooltipEval = ctrl.$sanitize(tooltip);
    var match;
    do {
      match = regExp.exec(tooltip);
      if (match){
        var index = columnTexts.indexOf(match[1]);
        var replaceWith = index!== -1 ? `d[${index}]` : "";

        tooltipEval = tooltipEval.replace(match[1], replaceWith)
      }
    } while (match);

    return tooltipEval;
  }

  function getPanelWidthBySpan() {
    var trueWidth = 0;
    if (typeof panel.span === 'undefined') {
      // get the width based on the scaled container (v5 needs this)
      trueWidth = $panelContainer[0].clientWidth;
    } else {
      // v4 and previous used fixed spans
      var viewPortWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
      // get the pixels of a span
      var pixelsPerSpan = viewPortWidth / 12;
      // multiply num spans by pixelsPerSpan
      trueWidth = Math.round(panel.span * pixelsPerSpan);
    }
    return trueWidth;
  }


  function addChordChart(matrix, mmap) {

    function checkHighlight(d) {
      return ctrl.highlight_text && d.toLowerCase().indexOf(ctrl.highlight_text) !== -1;
    }

    if(typeof d3 == 'undefined')
      return;

    var width = getPanelWidthBySpan();
    var height = elem.height();
    // var color = d3.scaleOrdinal(d3[panel.color_scale]);
    // d3.select(elem[0]).selectAll("*").remove();
    d3.select(".d3-chord").remove();
    var w = width, h = height, r1 = h / 2, r0 = r1 - 110;
    var fill = d3.scale.ordinal()
      .range(['#eca1a6','#7a3b2e', '#d6cbd3','#454140','#ff7b25','#d64161','#feb236','#6b5b95','#bdcebe',
        "#023fa5", "#7d87b9", "#bec1d4", "#d6bcc0",'#a79e84', "#bb7784", "#8e063b", "#4a6fe3", "#8595e1", "#b5bbe3",
        "#e6afb9",'#f7786b', "#e07b91",'#ada397', "#d33f6a", "#11c638", "#8dd593",'#92a8d1', "#c6dec7", "#ead3c6", "#f0b98d", "#ef9708", "#0fcfc0",
        "#9cded6", "#d5eae7", "#f3e1eb", "#f6c4e1",'#bd5734', "#f79cd4",'#034f84']);
    var chord = d3.layout.chord()
      .padding(.02)
      .sortSubgroups(d3.descending)
      .sortChords(d3.descending);
    var arc = d3.svg.arc()
      .innerRadius(r0)
      .outerRadius(r0 + 20);
    var highlightedArc = d3.svg.arc()
      .innerRadius(r0 )
      .outerRadius(r0 + 70);
    var svg = d3.select(panel.svgContainer)
      .append("svg")
      .attr("width", w)
      .attr("height", h)
      .attr("class", "d3-chord")
      .append("svg:g")
      .attr("id", "circle")
      .attr("transform", "translate(" + w / 2 + "," + h / 2 + ")");
    svg.append("circle")
      .attr("r", r0 + 20);
    var rdr = Mapper.chordRdr(matrix, mmap);
    chord.matrix(matrix);
    var g = svg.selectAll("g.group")
      .data(chord.groups())
      .enter().append("svg:g")
      .attr("class", "group")
      .on("mouseover", mouseover)
      .on("mouseout", function (d) {
        d3.select("#tooltip").style("visibility", "hidden");
        allTheGroups.transition().style("font-size", function(d) { return checkHighlight(rdr(d).gname) ? "15px" : "0px"; });
      });
    var allArcs = g.append("svg:path")
      .style("stroke", "black")
      .style("fill", function(d) { return fill(rdr(d).gname); })
      .attr("d", arc);
    var allTheGroups = g.append("svg:text")
      .each(function(d) { d.angle = (d.startAngle + d.endAngle) / 2; })
      .attr("dy", ".35em")
      .style("font-family", "helvetica, arial, sans-serif")
      .style("font-size", "0px") // remove text
      .style("fill", "white")
      .attr("text-anchor", function(d) { return d.angle > Math.PI ? "end" : null; })
      .attr("transform", function(d) {
        return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")"
          + "translate(" + (r0 + 26) + ")"
          + (d.angle > Math.PI ? "rotate(180)" : "");
      })
      .text(function(d) { return rdr(d).gname; })
    var chordPaths = svg.selectAll("path.chord")
      .data(chord.chords())
      .enter().append("svg:path")
      .attr("class", "chord")
      .style("stroke", function(d) { return d3.rgb(fill(rdr(d).sname)).darker(); })
      .style("fill", function(d) { return fill(rdr(d).sname); })
      .attr("d", d3.svg.chord().radius(r0))
      .on("mouseover", function (d) {
        d3.select("#tooltip")
          .style("visibility", "visible")
          .html(chordTip(rdr(d)))
          .style("top", function () { return (d3.event.pageY - 170)+"px"})
          .style("left", function () { return (d3.event.pageX - 100)+"px";});
        let actualItem = rdr(d);
        allTheGroups.transition().style("font-size", function(item)
        {
          let itemName = rdr(item).gname;
          return actualItem.tname === itemName || actualItem.sname === itemName ? "15px"  : "0px"
        });
      })
      .on("mouseout", function () {
        d3.select("#tooltip").style("visibility", "hidden");
        allTheGroups.transition().style("font-size", function(d) { return checkHighlight(rdr(d).gname) ? "15px" : "0px"; });
      });
    function chordTip (d) {
      var p = d3.format(".1%"), q = d3.format(",.2f")
      return "Chord Info:<br/>"
        +  d.sname + "\'s coupling to " + d.tname
        + ": " + d.svalue + "<br/>"
        + p(d.svalue/d.stotal) + " of " + d.sname + "'s Total (" + d.stotal + ")<br/>"
        + p(d.svalue/d.mtotal) + " of Total (" + d.mtotal + ")<br/>"
        // + "<br/>"
        // + d.tname + " imports from " + d.sname
        // + ": $" + q(d.tvalue) + "M<br/>"
        // + p(d.tvalue/d.ttotal) + " of " + d.tname + "'s Total ($" + q(d.ttotal) + ")<br/>"
        // + p(d.tvalue/d.mtotal) + " of Total ($" + q(d.mtotal) + ")";
    }
    function groupTip (d) {
      var p = d3.format(".1%"), q = d3.format(",.2f")
      return "Coupling Info:<br/>"
        + d.gname + " : " + q(d.gvalue) + "<br/>"
        + p(d.gvalue/d.mtotal) + " of Total (" + q(d.mtotal) + ")"
    }
    function mouseover(d, i) {
      let actualItem = rdr(d);
      allTheGroups.transition().style("font-size", function(item)
      {
        let itemName = rdr(item).gname;
        return actualItem.connections.includes(itemName) || actualItem.gname === itemName ? "15px"  : "0px"
      });
      // _.each(allTheGroups, (group) => {
      //   if (group.textContent === d.textContent) {
      //     group.transition().style("font-size", "15px");
      //   }
      // });
      d3.select("#tooltip")
        .style("visibility", "visible")
        .html(groupTip(rdr(d)))
        .style("top", function () { return (d3.event.pageY - 80)+"px"})
        .style("left", function () { return (d3.event.pageX - 130)+"px";})
      chordPaths.classed("fade", function(p) {
        return p.source.index != i
          && p.target.index != i;
      });
    }

    if (ctrl.highlight_text) {
      allTheGroups.transition().style("font-size", function(d) { return checkHighlight(rdr(d).gname) ? "15px" : "0px"; });
      allArcs.transition()
        .duration(1000)
        .delay(2000)
        .style("stroke", "black")
        .style("fill", function(d) { return fill(rdr(d).gname); })
        .attr("d",   function(d)  {
          return checkHighlight(rdr(d).gname) ? highlightedArc(d) : arc(d)
        })
        .transition()
        .duration(1000)
        .delay(10000)
        .style("stroke",  function(d) { return checkHighlight(rdr(d).gname) ? "lightblue" : "black" })
        .attr("d", arc)

    }
  }


  function render() {
    data = ctrl.data;
    panel = ctrl.panel;
    if (setElementHeight())

      if(ctrl._error || !data || !data.length)
      {

        showError(ctrl._error || "No data points");

        data = [];
        addChordChart();

      }
      else
      {
        var mpr = Mapper.chordMpr(data);
        mpr
          .addValuesToMap('source')
          .addValuesToMap('target')
          .setFilter(function (row, a, b) {
            return (row.source === a.name && row.target === b.name) ||
              (row.source === b.name && row.target === a.name)
          })
          .setAccessor(function (recs, a, b) {
            if (!recs[0]) return 0;
            return recs[0].source === a.name ? +recs[0].couplingValue : +recs[0].couplingValue;
          });
        addChordChart(mpr.getMatrix(), mpr.getMap());
        showError(false);
      }


    ctrl.renderingCompleted();
  }
}

