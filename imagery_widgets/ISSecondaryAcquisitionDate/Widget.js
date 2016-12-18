///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

define([
    'dojo/_base/declare',
    'dijit/_WidgetsInTemplateMixin',
    'esri/SpatialReference',
    'jimu/BaseWidget',
    'dojo/_base/lang',
    "dojo/_base/array",
    "dojo/date/locale",
    "dojo/html",
    "esri/request"
],
        function(
                declare,
                _WidgetsInTemplateMixin,
                SpatialReference,
                BaseWidget,
                lang,
                array,
                locale,
                html,
                esriRequest) {
            var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {
                baseClass: 'jimu-widget-ISSecondaryAcquisitionDate',
                name: 'ISSecondaryAcquisitionDate',
                requestCount:0,
                primaryLayer: null,
                postCreate: function() {
                    this.layerInfos = this.config;
                    if (this.map.layerIds.length > 2) {
                        this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 1]);
                        this.secondaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 2]);
                        this.map.on("update-start", lang.hitch(this, this.clearDateRange));
                        this.map.on("update-end", lang.hitch(this, this.changeDateRange));
                        this.map.on("layer-reorder", lang.hitch(this, this.changeDateRange));
                        if (this.primaryLayer) {
                            this.primaryLayer.on("visibility-change", lang.hitch(this, this.changeDateRange));
                        }
                        if (this.secondaryLayer) {
                            this.secondaryLayer.on("visibility-change", lang.hitch(this, this.changeDateRange));
                        }
                    }
                },
                onOpen:function(){
                    if(this.map.layerIds.length > 2){
                        this.changeDateRange();
                    }
                },
                clearDateRange: function() {
                    html.set(this.secondaryDate, '');
                },
                secondarydate : function()
                {
                    if (this.dateField) {
                                var layer = this.secondaryLayer;
                                var e = this.map.extent;
                                var polygonJson = {
                                    "rings": [[[e.xmin, e.ymin], [e.xmin, e.ymax], [e.xmax, e.ymax], [e.xmax, e.ymin], [e.xmin, e.ymin]]],
                                    "spatialReference": new SpatialReference(e.spatialReference)
                                };
                                    
                                var mosaicRule;
                      if(layer.mosaicRule){
                          if(layer.mosaicRule.method==="esriMosaicLockRaster"){
                              var queryNum = this.requestCount;
                              queryNum++;
                              this.requestCount = queryNum;
                              var query = new Query();
                              query.objectIds = layer.mosaicRule.lockRasterIds;
                              query.returnGeometry = false;
                              query.outFields = [this.dateField];
                              query.geometry = this.map.extent;
                              var queryTask = new QueryTask(layer.url);
                              queryTask.execute(query,lang.hitch(this,function(result){
                                  if(queryNum===this.requestCount){
                                  var dates = [];
                                  for (var i = 0; i< result.features.length; i++){
                                      if(result.features[i].attributes[this.dateField] && (array.indexOf(dates, result.features[i].attributes[this.dateField]) === -1)){
                                          dates.push(result.features[i].attributes[this.dateField]);
                                      }
                                  }
                                  if (dates.length !== 0) {
                                      var max = dates.reduce(function(previous, current) {
                                        return previous > current ? previous : current;
                                      });
                                      var min = dates.reduce(function(previous, current) {
                                          return previous < current ? previous : current;
                                      });
                                      this.minDate = new Date(min);
                                      this.maxDate = new Date(max);
                                      var maxdate = locale.format(this.maxDate, {selector: "date", formatLength: "long"});
                                      var mindate = locale.format(this.minDate, {selector: "date", formatLength: "long"});
                                      if (mindate === maxdate) {
                                          html.set(this.secondaryDate, '<br/>S: ' + mindate);
                                      } else {
                                          html.set(this.secondaryDate, '<br/>S: ' + mindate + ' -  ' + maxdate);
                                      }
                                  } else {
                                      html.set(this.secondaryDate, '');
                                  }}
                              }));
                          }else{
                              var queryNum = this.requestCount;
                              queryNum++;
                              this.requestCount = queryNum;
                              mosaicRule = layer.mosaicRule;
                              mosaicRule.where = "Category=1";
                              var identifyRequest = esriRequest({
                                  url: layer.url+'/identify',
                                  content: {
                                      f: "json",
                                      geometry: JSON.stringify(polygonJson),
                                      geometryType: "esriGeometryPolygon",
                                      returnCatalogItems: "true",
                                      mosaicRule: JSON.stringify(mosaicRule.toJson())
                                  },
                                  handleAs: "json",
                                  callbackParamName: "callback"
                              });
                              identifyRequest.then(lang.hitch(this,function(result){
                                  if(queryNum===this.requestCount){
                                  var dates = [];
                                  for (var i=0;i<result.catalogItems.features.length;i++){
                                    if(result.catalogItemVisibilities[i]!==0&&result.catalogItems.features[i].attributes[this.dateField]&&(array.indexOf(dates, result.catalogItems.features[i].attributes[this.dateField]) === -1)){
                                        dates.push(result.catalogItems.features[i].attributes[this.dateField]);
                                    }
                                  }
                                  if (dates.length !== 0) {
                                      var max = dates.reduce(function(previous, current) {
                                          return previous > current ? previous : current;
                                      });
                                      var min = dates.reduce(function(previous, current) {
                                          return previous < current ? previous : current;
                                      });
                                      this.minDate = new Date(min);
                                      this.maxDate = new Date(max);
                                      var maxdate = locale.format(this.maxDate, {selector: "date", formatLength: "long"});
                                      var mindate = locale.format(this.minDate, {selector: "date", formatLength: "long"});
                                      if (mindate === maxdate) {
                                          html.set(this.secondaryDate, '<br/>S: ' + mindate);
                                      } else {
                                          html.set(this.secondaryDate, '<br/>S: ' + mindate + ' -  ' + maxdate);
                                      }
                                  } else {
                                      html.set(this.secondaryDate, '');
                                  }}
                              }));
                          }
                      }
                      else{
                          var queryNum = this.requestCount;
                          queryNum++;
                          this.requestCount = queryNum;
                          var query = new Query();
                          query.where = "Category=1";
                          query.returnGeometry = false;
                          query.outFields = [this.dateField];
                          query.geometry = this.map.extent;
                          
                          var queryTask = new QueryTask(layer.url);
                          queryTask.executeForCount(query,lang.hitch(this,function(count){
                              if(queryNum===this.requestCount){
                              if(count<=1000){
                              query.start = 0;
                              query.num = count;
                              queryTask.execute(query,lang.hitch(this,function(result){
                              var dates = [];
                              for (var i = 0; i< result.features.length; i++){
                                  if(result.features[i].attributes[this.dateField] && (array.indexOf(dates, result.features[i].attributes[this.dateField]) === -1)){
                                      dates.push(result.features[i].attributes[this.dateField]);
                                  }
                              }
                              if (dates.length !== 0) {
                                  var max = dates.reduce(function(previous, current) {
                                    return previous > current ? previous : current;
                                  });
                                  var min = dates.reduce(function(previous, current) {
                                      return previous < current ? previous : current;
                                  });
                                  this.minDate = new Date(min);
                                  this.maxDate = new Date(max);
                                  var maxdate = locale.format(this.maxDate, {selector: "date", formatLength: "long"});
                                  var mindate = locale.format(this.minDate, {selector: "date", formatLength: "long"});
                                  if (mindate === maxdate) {
                                      html.set(this.secondaryDate, '<br/>S: ' + mindate);
                                  } else {
                                      html.set(this.secondaryDate, '<br/>S: ' + mindate + ' -  ' + maxdate);
                                  }
                              } else {
                                  html.set(this.primaryDate, '');
                              }
                              }));
                              }
                              else{
                                query.start = 0;
                                query.num = 1;
                                query.orderByFields = [this.dateField+" DESC"];
                                queryTask.execute(query,lang.hitch(this,function(result){
                                    this.maxDate = new Date(result.features[0].attributes[this.dateField]);
                                    query.start = count-1;
                                    query.num = 1;
                                    queryTask.execute(query,lang.hitch(this,function(result){
                                        this.minDate = new Date(result.features[0].attributes[this.dateField]);
                                        var maxdate = locale.format(this.maxDate, {selector: "date", formatLength: "long"});
                                        var mindate = locale.format(this.minDate, {selector: "date", formatLength: "long"});
                                        if (mindate === maxdate) {
                                            html.set(this.secondaryDate, '<br/>S: ' + mindate);
                                        } else {
                                            html.set(this.secondaryDate, '<br/>S: ' + mindate + ' -  ' + maxdate);
                                        }
                                    }));
                                }));
                              }}
                          }));
                      }
                            } else {
                                html.set(this.secondaryDate, '');
                            }
                },
                changeDateRange: function() {
                    this.previousPrimary = this.primaryLayer;
                    if (this.map.getLayer("resultLayer")) {
                        this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 2]);
                        this.secondaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 3]);
                    } else {
                        this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 1]);
                        this.secondaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 2]);
                    }
                    
                    this.secondLabel = this.secondaryLayer.url.split('//')[1];

                    if (this.previousPrimary !== this.primaryLayer) {
                        this.primaryLayer.on("visibility-change", lang.hitch(this, this.changeDateRange));
                    }

                    if (this.secondaryLayer && this.secondaryLayer.visible) {
                        if (this.layerInfos[this.secondLabel]) {
                            this.dateField = this.layerInfos[this.secondLabel].dateField;
                            this.secondarydate();
                        }
                        else{
                            var obj={};
                            if (this.secondaryLayer.timeInfo && this.secondaryLayer.timeInfo.startTimeField) {
                                var timeInfo = this.secondaryLayer.timeInfo;
                                var field = timeInfo.startTimeField;
                                if (field) {
                                    this.dateField = field;
                                    obj.dateField = field;
                                } else {
                                    this.dateField = null;
                                    obj.dateField = null;
                                }
                                this.secondarydate();
                            } else {
                               var layersRequest1 = esriRequest({
                                    url: this.secondaryLayer.url,
                                    content: {f: "json"},
                                    handleAs: "json",
                                    callbackParamName: "callback"
                                });
                                layersRequest1.then(lang.hitch(this, function(data) {
                                    var timeInfo = data.timeInfo;
                                    if (timeInfo) {
                                        var field = timeInfo.startTimeField;
                                        if (field) {
                                            this.dateField = field;
                                            obj.dateField = field;
                                        } else {
                                            var regExp = new RegExp(/acq[a-z]*[_]?Date/i);
                                            for (var i in data.fields){
                                                if(regExp.test(data.fields[i].name)){
                                                    this.dateField = data.fields[i].name;
                                                    obj.dateField = data.fields[i].name;
                                                    break;
                                                }
                                                else if(data.fields[i].type==="esriFieldTypeDate"){
                                                    this.dateField = data.fields[i].name;
                                                    obj.dateField = data.fields[i].name;
                                                    break;
                                                }
                                                this.dateField= null;
                                                obj.dateField= null;
                                            }
                                        }
                                    }else {
                                        var regExp = new RegExp(/acq[a-z]*[_]?Date/i);
                                        for (var i in data.fields){
                                            if(regExp.test(data.fields[i].name)){
                                                this.dateField = data.fields[i].name;
                                                obj.dateField = data.fields[i].name;
                                                break;
                                            }
                                            else if(data.fields[i].type==="esriFieldTypeDate"){
                                                this.dateField = data.fields[i].name;
                                                obj.dateField = data.fields[i].name;
                                                break;
                                            }
                                            this.dateField= null;
                                            obj.dateField= null;
                                        }
                                    }
                                    this.secondarydate();
                                }));
                            }
                            this.layerInfos[this.secondaryLabel] = obj;
                        } 
                    } else {
                        html.set(this.secondaryDate, '');
                    }
                }
            });
            clazz.hasLocale = false;
            clazz.hasSettingPage = true;
            clazz.hasSettingUIFile = true;
            clazz.hasSettingLocale = false;
            clazz.hasSettingStyle = true;
            clazz.inPanel = false;
            return clazz;
        });