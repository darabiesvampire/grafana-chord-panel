'use strict';

System.register(['app/plugins/sdk', 'lodash', './rendering'], function (_export, _context) {
  "use strict";

  var MetricsPanelCtrl, _, rendering, _createClass, ChordCtrl;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _possibleConstructorReturn(self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === "object" || typeof call === "function") ? call : self;
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  }

  return {
    setters: [function (_appPluginsSdk) {
      MetricsPanelCtrl = _appPluginsSdk.MetricsPanelCtrl;
    }, function (_lodash) {
      _ = _lodash.default;
    }, function (_rendering) {
      rendering = _rendering.default;
    }],
    execute: function () {
      _createClass = function () {
        function defineProperties(target, props) {
          for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];
            descriptor.enumerable = descriptor.enumerable || false;
            descriptor.configurable = true;
            if ("value" in descriptor) descriptor.writable = true;
            Object.defineProperty(target, descriptor.key, descriptor);
          }
        }

        return function (Constructor, protoProps, staticProps) {
          if (protoProps) defineProperties(Constructor.prototype, protoProps);
          if (staticProps) defineProperties(Constructor, staticProps);
          return Constructor;
        };
      }();

      _export('ChordCtrl', ChordCtrl = function (_MetricsPanelCtrl) {
        _inherits(ChordCtrl, _MetricsPanelCtrl);

        function ChordCtrl($scope, $injector, $rootScope, $interpolate, $sanitize, templateSrv, detangleSrv) {
          _classCallCheck(this, ChordCtrl);

          var _this = _possibleConstructorReturn(this, (ChordCtrl.__proto__ || Object.getPrototypeOf(ChordCtrl)).call(this, $scope, $injector));

          _this.$rootScope = $rootScope;
          _this.$interpolate = $interpolate;
          _this.$sanitize = $sanitize;
          _this.templateSrv = templateSrv;
          _this.detangleSrv = detangleSrv;
          var panelDefaults = {};

          _.defaults(_this.panel, panelDefaults);

          //this.events.on('render', this.onRender.bind(this));
          _this.events.on('data-received', _this.onDataReceived.bind(_this));
          _this.events.on('data-error', _this.onDataError.bind(_this));
          _this.events.on('data-snapshot-load', _this.onDataReceived.bind(_this));
          _this.events.on('init-edit-mode', _this.onInitEditMode.bind(_this));
          return _this;
        }

        _createClass(ChordCtrl, [{
          key: 'onInitEditMode',
          value: function onInitEditMode() {
            this.addEditorTab('Options', 'public/plugins/grafana-chord-panel/editor.html', 2);
          }
        }, {
          key: 'onDataError',
          value: function onDataError() {
            this.columnMap = [];
            this.columns = [];
            this.data = [];
            this.render();
          }
        }, {
          key: 'colorSelectOptions',
          value: function colorSelectOptions() {
            var values = ["index", "regular expression"];

            if (!this.columns) return [];

            var selectors = _.map(this.columns, "text");

            selectors.splice(-1);

            return values.concat(selectors);
          }
        }, {
          key: 'combineOptions',
          value: function combineOptions() {
            if (!this.columns || this.columns.length < 2) return [];

            return [this.columns[0].text, this.columns[1].text];
          }
        }, {
          key: 'onDataReceived',
          value: function onDataReceived(dataList) {
            var data = dataList[0];

            if (!data) {
              this._error = "No data points.";
              return this.render();
            }

            if (data.type !== "table") {
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
              targetTypeData: 'All'
            }, 'chord');
            this.render(this.data);
          }
        }, {
          key: 'link',
          value: function link(scope, elem, attrs, ctrl) {
            rendering(scope, elem, attrs, ctrl);
          }
        }, {
          key: 'highlight',
          value: function highlight() {
            this.render();
            this.prev_highlight_text = this.highlight_text;
          }
        }]);

        return ChordCtrl;
      }(MetricsPanelCtrl));

      _export('ChordCtrl', ChordCtrl);

      ChordCtrl.templateUrl = 'module.html';
    }
  };
});
//# sourceMappingURL=chord_ctrl.js.map
