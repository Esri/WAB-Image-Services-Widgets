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
    "esri/geometry/Point",
    'esri/SpatialReference',
    'jimu/BaseWidget',
    'dojo/_base/lang',
    'dojo/on',
    "dojo/dom-style",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dijit/DropDownMenu",
    "dijit/MenuItem",
    "dijit/CheckedMenuItem",
    "dojo/aspect",
    "esri/tasks/ProjectParameters",
    "esri/config",
    "esri/geometry/Extent",
    "esri/tasks/query",
    "dojo/_base/array",
    "dojo/date/locale",
    "dojo/html",
    "esri/tasks/QueryTask",
    "esri/geometry/Polygon",
    "esri/tasks/IdentifyParameters",
    "esri/tasks/IdentifyTask",
    "esri/request",
    "esri/graphic"
],
        function(
                declare,
                _WidgetsInTemplateMixin,
                Point,
                SpatialReference,
                BaseWidget,
                lang,
                on,
                domStyle,
                domClass,
                domConstruct,
                DropDownMenu,
                MenuItem,
                CheckedMenuItem,
                aspect,
                ProjectParameters,
                esriConfig,
                Extent,
                Query,
                array,
                locale,
                html,
                QueryTask,
                Polygon,
                IdentifyParameters,
                IdentifyTask,
                esriRequest) {
            /**
             * The Coordinate widget displays the current mouse coordinates.
             * If the map's spatial reference is geographic or web mercator, the coordinates can be displayed as
             * decimal degrees or as degree-minute-seconds.
             * Otherwise, the coordinates will show in map units.
             *
             * @module widgets/Coordinate
             */
            var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {
                baseClass: 'jimu-widget-ISPrimaryAcquisitionDate',
                name: 'ISPrimaryAcquisitionDate',
                primaryLayer: null,
                postCreate: function() {
                    if (this.map.layerIds) {
                        this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 1]);
                        this.map.on("update-start", lang.hitch(this, this.clearDateRange));
                        this.map.on("update-end", lang.hitch(this, this.changeDateRange));
                        if (this.primaryLayer) {
                            this.primaryLayer.on("visibility-change", lang.hitch(this, this.changeDateRange));
                        }
                    }
                   
                },
                clearDateRange: function() {
                    html.set(this.primaryDate, '');
                },
                primarydate : function()
                {
                   if (this.dateField) {
                       
                                var layer = this.primaryLayer;
                                var query = new Query();
                                var e = this.map.extent;
                                var polygonJson = {
                                    "rings": [[[e.xmin, e.ymin], [e.xmin, e.ymax], [e.xmax, e.ymax], [e.xmax, e.ymin], [e.xmin, e.ymin]]],
                                    "spatialReference": new SpatialReference(e.spatialReference)
                                    
                                };
//                        query.geometry = new Extent(e.xmin, e.ymin, e.xmax, e.ymax, new SpatialReference(e.spatialReference));
                                query.geometry = new Polygon(polygonJson);
                                query.outFields = [this.dateField];
                                query.returnGeometry = false;
                                var queryVisible = layer.queryVisibleRasters(query);
                                queryVisible.then(lang.hitch(this, function(result) {
                                    var dates = [];
                                    console.log(result);
                                    for (var i = 0; i < result.length; i++) {
                                        if (result[i].attributes[this.dateField] && (array.indexOf(dates, result[i].attributes[this.dateField]) == -1)) {
                                            dates.push(result[i].attributes[this.dateField]);
                                        }
                                    }
                                    if (dates.length != 0) {
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
                                        if (mindate == maxdate) {
                                            html.set(this.primaryDate, '<br/>P: ' + mindate);
                                        } else {
                                            html.set(this.primaryDate, '<br/>P: ' + mindate + ' -  ' + maxdate);
                                        }
                                    } else {
                                        html.set(this.primaryDate, '');
                                    }  
                }));
                            } else {
                                html.set(this.primaryDate, '');
                            }},
                changeDateRange: function() {
                    
                    this.previousPrimary = this.primaryLayer;
                    if (this.map.getLayer("resultLayer")) {
                        this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 2]);
                    } else {
                        this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 1]);
                    }

                    if (this.previousPrimary != this.primaryLayer) {
                        this.primaryLayer.on("visibility-change", lang.hitch(this, this.changeDateRange));
                    }

                    if (this.primaryLayer && this.primaryLayer.visible) {
                        if(this.primaryLayer.timeInfo && this.primaryLayer.timeInfo.startTimeField) {
                        var timeInfo = this.primaryLayer.timeInfo;
                                var field = timeInfo.startTimeField;
                                if (field) {
                                    this.dateField = field;
                                } else {
                                    this.dateField = null;
                                }
                               
                                this.primarydate();
                            } else{
                                var layersRequest = esriRequest({
                            url: this.primaryLayer.url,
                            content: {f: "json"},
                            handleAs: "json",
                            callbackParamName: "callback"
                        });
                        layersRequest.then(lang.hitch(this, function(data) {
                       var timeInfo = data.timeInfo;
                       if (timeInfo) {
                           var field = timeInfo.startTimeField;
                                if (field) {
                                    this.dateField = field;
                                } else {
                                    this.dateField = null;
                                }
                       }else {
                       this.dateField= null;
                            }
                       this.primarydate();
                            
                        }));  
                    }


                         

                    } else {
                        html.set(this.primaryDate, '');
                    }
                }
            });

            clazz.hasLocale = false;
            clazz.hasSettingPage = false;
            clazz.hasSettingUIFile = false;
            clazz.hasSettingLocale = false;
            clazz.hasSettingStyle = false;
            clazz.inPanel = false;
            return clazz;
        });