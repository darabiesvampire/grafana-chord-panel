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

    };

    _.defaults(this.panel, panelDefaults);

    //this.events.on('render', this.onRender.bind(this));
    this.events.on('data-received', this.onDataReceived.bind(this));
    this.events.on('data-error', this.onDataError.bind(this));
    this.events.on('data-snapshot-load', this.onDataReceived.bind(this));
    this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
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
    this.data = this.detangleSrv.dataConvertor(dataList, this.templateSrv, {
      target: 'file',
      metric: 'coupling',
      coupling: true,
      sortingOrder: 'desc',
      sourceTypeData: 'All',
      targetTypeData: 'All',
    }, 'chord');
    this.render(this.data);
  }


  link(scope, elem, attrs, ctrl) {
    rendering(scope, elem, attrs, ctrl);
  }


  highlight(){
    this.render(); 
    this.prev_highlight_text =  this.highlight_text;
  }
}

ChordCtrl.templateUrl = 'module.html';
