'use strict';

System.register(['lodash'], function (_export, _context) {
  "use strict";

  var _, _createClass, Mapper;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  return {
    setters: [function (_lodash) {
      _ = _lodash.default;
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

      Mapper = function () {
        function Mapper() {
          _classCallCheck(this, Mapper);
        }

        _createClass(Mapper, null, [{
          key: 'chordMpr',
          value: function chordMpr(data) {
            var mpr = {},
                mmap = {},
                n = 0,
                matrix = [],
                filter = void 0,
                accessor = void 0;

            mpr.setFilter = function (fun) {
              filter = fun;
              return this;
            }, mpr.setAccessor = function (fun) {
              accessor = fun;
              return this;
            }, mpr.getMatrix = function () {
              matrix = [];
              _.each(mmap, function (a) {
                if (!matrix[a.id]) matrix[a.id] = [];
                _.each(mmap, function (b) {
                  var recs = _.filter(data, function (row) {
                    return filter(row, a, b);
                  });
                  matrix[a.id][b.id] = accessor(recs, a, b);
                });
              });
              return matrix;
            }, mpr.getMap = function () {
              return mmap;
            }, mpr.printMatrix = function () {
              _.each(matrix, function (elem) {
                console.log(elem);
              });
            }, mpr.addToMap = function (value, info) {
              if (!mmap[value]) {
                mmap[value] = { name: value, id: n++, data: info };
              }
            }, mpr.addValuesToMap = function (varName, info) {
              var values = _.uniq(_.map(data, varName));
              _.map(values, function (v) {
                if (!mmap[v]) {
                  mmap[v] = { name: v, id: n++, data: info };
                }
              });
              return this;
            };
            return mpr;
          }
        }, {
          key: 'chordRdr',
          value: function chordRdr(matrix, mmap) {
            return function (d) {
              var i = void 0,
                  j = void 0,
                  s = void 0,
                  t = void 0,
                  g = void 0,
                  m = {};
              if (d.source) {
                i = d.source.index;j = d.target.index;
                s = _.filter(mmap, { id: i });
                t = _.filter(mmap, { id: j });
                m.sname = s[0].name;
                m.sdata = d.source.value;
                m.svalue = +d.source.value;
                m.stotal = _.reduce(matrix[i], function (k, n) {
                  return k + n;
                }, 0);
                m.tname = t[0].name;
                m.tdata = d.target.value;
                m.tvalue = +d.target.value;
                m.ttotal = _.reduce(matrix[j], function (k, n) {
                  return k + n;
                }, 0);
              } else {
                g = _.filter(mmap, { id: d.index });
                m.gname = g[0].name;
                m.gdata = g[0].data;
                m.gvalue = d.value;
              }
              m.mtotal = _.reduce(matrix, function (m1, n1) {
                return m1 + _.reduce(n1, function (m2, n2) {
                  return m2 + n2;
                }, 0);
              }, 0);
              return m;
            };
          }
        }]);

        return Mapper;
      }();

      _export('default', Mapper);
    }
  };
});
//# sourceMappingURL=mapper.js.map
