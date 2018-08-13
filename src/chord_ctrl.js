import {MetricsPanelCtrl} from 'app/plugins/sdk';
import _ from 'lodash';
import rendering from './rendering';

export class ChordCtrl extends MetricsPanelCtrl {

  constructor($scope, $injector, $rootScope, $interpolate, $sanitize, templateSrv, detangleSrv) {
    super($scope, $injector);
    this.$rootScope = $rootScope;
    this.$interpolate = $interpolate;
    this.$sanitize = $sanitize;
    this.templateSrv = templateSrv;
    this.detangleSrv = detangleSrv;
    var panelDefaults = {
      detangle: {
        coupling: true,
        metric: 'coupling',
        target: 'file',
        cohesionCalculationMethod: 'standard',
        sourceType: '$issue_type',
        targetType: '$target_issue_type',
        sourceTypeData: '',
        targetTypeData: '',
        author: '$author',
        authorData: '',
        yearData: '',
        minIssuesPerFile: '$min_issues',
        minIssuesData: '',
        minFilesPerIssue: null,
        minFilesData: '',
        issueTitle: '$issue_title',
        issueTitleData: '',
        fileExcludeFilter: '$file_exclude',
        fileExcludeFilterData: '',
        metricRange: '$metric_range',
        metricRangeData: '',
        fileGroup: '$file_group',
      }
    };

    _.defaults(this.panel, panelDefaults);
    this.panel.chordDivId = 'd3chord_svg_' + this.panel.id;
    this.containerDivId = 'container_'+this.panel.chordDivId;
    this.panelContainer = null;
    this.panel.svgContainer = null;

    //this.events.on('render', this.onRender.bind(this));
    this.events.on('data-received', this.onDataReceived.bind(this));
    this.events.on('data-error', this.onDataError.bind(this));
    this.events.on('data-snapshot-load', this.onDataReceived.bind(this));
    this.events.on('init-edit-mode', this.onInitEditMode.bind(this));

    this.couplingMetrics = [
      {text: 'Coupling Value', value: 'coupling'},
      {text: 'Num. of Couples', value: 'couplecounts'},
      {text: 'Cohesion Value', value: 'cohesion'},

    ];

    this.targetSelections = [
      {text: 'Issues|Committers', value: 'issue'},
      {text: 'Files', value: 'file'},
    ];

    this.cohesionCalculationMethods = [
      {
        text: 'Standard', value: 'standard'
      },
      {
        text: 'Double', value: 'double'
      }
    ];
  }

  onInitEditMode() {
    this.addEditorTab('Options', 'public/plugins/grafana-chord-panel/editor.html', 2);
  }


  onDataError() {
    this.columnMap = [];
    this.columns = [];
    this.data = [];
    this.render();
  }

  setContainer(container) {
    this.panelContainer = container;
    this.panel.svgContainer = container;
  }


  colorSelectOptions(){
    var values = ["index","regular expression"];

    if(!this.columns)
      return[];

    var selectors = _.map(this.columns,"text");

    selectors.splice(-1);
    
    return values.concat(selectors);
  }

  combineOptions(){
    if(!this.columns || this.columns.length < 2)
      return[];

    return [
      this.columns[0].text ,
      this.columns[1].text ,
      ];
  }


  onDataReceived(dataList) {
    let data = dataList[0];

    if(!data)
    {
      this._error = "No data points.";
      return this.render();
    }

    if(data.type !== "table")
    {
      this._error = "Should be table fetch. Use terms only.";
      return this.render();
    }

    this._error = null;

    this.columnMap = data.columnMap; 
    this.columns = data.columns;
    this.data = this.detangleSrv.dataConvertor(dataList, this.templateSrv, this.panel.detangle, 'chord');
    this.render(this.data);
  }


  link(scope, elem, attrs, ctrl) {
    rendering(scope, elem, attrs, ctrl);
  }


  highlight(){
    this.render(); 
  }
}

ChordCtrl.templateUrl = 'module.html';
