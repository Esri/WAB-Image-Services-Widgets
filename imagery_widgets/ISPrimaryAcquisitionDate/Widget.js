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
    "esri/request",
    "esri/graphic"
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
                baseClass: 'jimu-widget-ISPrimaryAcquisitionDate',
                name: 'ISPrimaryAcquisitionDate',
                primaryLayer: null,
                postCreate: function() {
                    this.layerInfos = this.config;
                    if (this.map.layerIds) {
                        this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 1]);
                        this.map.on("update-start", lang.hitch(this, this.clearDateRange));
                        this.map.on("update-end", lang.hitch(this, this.changeDateRange));
                        this.map.on("layer-reorder", lang.hitch(this, this.changeDateRange));
                        if (this.primaryLayer) {
                            this.primaryLayer.on("visibility-change", lang.hitch(this, this.changeDateRange));
                        }
                    }
                   
                },
                onOpen:function(){
                    if(this.map.layerIds){
                        this.changeDateRange();
                    }
                },
                clearDateRange: function() {
                    html.set(this.primaryDate, '');
                },
                primarydate : function()
                {
                   if (this.dateField) {
                       
                                var layer = this.primaryLayer;
                                var e = this.map.extent;
                                var polygonJson = {
                                    "rings": [[[e.xmin, e.ymin], [e.xmin, e.ymax], [e.xmax, e.ymax], [e.xmax, e.ymin], [e.xmin, e.ymin]]],
                                    "spatialReference": new SpatialReference(e.spatialReference)
                                    
                                };
                                    
                                var mosaicRule;
                                if(layer.mosaicRule&&layer.mosaicRule.method==="esriMosaicLockRaster"){
                                    mosaicRule=layer.mosaicRule;
                                    var getSamplesRequest = esriRequest({
                                        url: layer.url+'/getSamples',
                                        content: {
                                            f:"json",
                                            outFields: this.dateField,
                                            geometry: JSON.stringify(polygonJson),
                                            geometryType: "esriGeometryPolygon",
                                            mosaicRule: JSON.stringify(mosaicRule.toJson()),
                                            returnFirstValueOnly:false
                                        },
                                        handleAs: "json",
                                        callbackParamName: "callback"
                                    });
                                    getSamplesRequest.then(lang.hitch(this,function(result){
                                        var dates = [];
                                            
                                        for (var i = 0; i < result.samples.length; i++) {
                                            if (result.samples[i].attributes[this.dateField] && (array.indexOf(dates, result.samples[i].attributes[this.dateField]) === -1)) {
                                                dates.push(result.samples[i].attributes[this.dateField]);
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
                                                html.set(this.primaryDate, '<br/>P: ' + mindate);
                                            } else {
                                                html.set(this.primaryDate, '<br/>P: ' + mindate + ' -  ' + maxdate);
                                            }
                                        } else {
                                            html.set(this.primaryDate, '');
                                        }
                                    }),lang.hitch(this,function(){
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
                                            var dates = [];
                                            for (var i=0;i<result.catalogItems.length;i++){
                                                if(result.catalogVisibilities[i]!==0&&result.catalogItems[i].attributes[this.dateField]&&(array.indexOf(dates, result.catalogItems[i].attributes[this.dateField]) === -1)){
                                                    dates.push(result.catalogItems[i].attributes[this.dateField]);
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
                                                    html.set(this.primaryDate, '<br/>P: ' + mindate);
                                                } else {
                                                    html.set(this.primaryDate, '<br/>P: ' + mindate + ' -  ' + maxdate);
                                                }
                                            } else {
                                                html.set(this.primaryDate, '');
                                            }
                                        }));
                                    }));
                                }
                                else{
                                    if(layer.mosaicRule)
                                        mosaicRule = layer.mosaicRule;
                                    else
                                        mosaicRule=layer.defaultMosaicRule;
                                    var getSamplesRequest = esriRequest({
                                        url: layer.url+'/getSamples',
                                        content: {
                                            f:"json",
                                            outFields: this.dateField,
                                            geometry: JSON.stringify(this.map.extent.getCenter()),
                                            geometryType: "esriGeometryPoint",
                                            mosaicRule: JSON.stringify(mosaicRule.toJson()),
                                            returnFirstValueOnly:false
                                        },
                                        handleAs: "json",
                                        callbackParamName: "callback"
                                    });
                                    getSamplesRequest.then(lang.hitch(this,function(result){
                                        var dates = [];
                                        
                                        for (var i = 0; i < result.samples.length; i++) {
                                            if (result.samples[i].attributes[this.dateField] && (array.indexOf(dates, result.samples[i].attributes[this.dateField]) === -1)) {
                                                dates.push(result.samples[i].attributes[this.dateField]);
                                            }
                                        }
                                        if (dates.length !== 0) {
                                            html.set(this.primaryDate, '<br/>P: ' + locale.format(new Date(dates[0]), {selector: "date", formatLength: "long"}));
                                        } else {
                                            html.set(this.primaryDate, '');
                                        }
                                    }),lang.hitch(this,function(){
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
                                            var dates = [];
                                            for (var i=0;i<result.catalogItems.length;i++){
                                                if(result.catalogVisibilities[i]!==0&&result.catalogItems[i].attributes[this.dateField]&&(array.indexOf(dates, result.catalogItems[i].attributes[this.dateField]) === -1)){
                                                    dates.push(result.catalogItems[i].attributes[this.dateField]);
                                                }
                                            }
                                            if (dates.length !== 0) {
                                                html.set(this.primaryDate, '<br/>P: ' + locale.format(new Date(dates[0]), {selector: "date", formatLength: "long"}));
                                            } else {
                                                html.set(this.primaryDate, '');
                                            }
                                        }));
                                    }));
                                }
                    } else {
                        html.set(this.primaryDate, '');
                    }
                },
                changeDateRange: function() {
                    
                    this.previousPrimary = this.primaryLayer;
                    if (this.map.getLayer("resultLayer")) {
                        this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 2]);
                    } else {
                        this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 1]);
                    }
                    
                    this.label = this.primaryLayer.url.split('//')[1];

                    if (this.previousPrimary !== this.primaryLayer) {
                        this.primaryLayer.on("visibility-change", lang.hitch(this, this.changeDateRange));
                    }

                    if (this.primaryLayer && this.primaryLayer.visible) {
                        if (this.layerInfos[this.label]) {
                            this.dateField = this.layerInfos[this.label].dateField;
                            this.primarydate();
                        }
                        else {
                            var obj={};
                            if(this.primaryLayer.timeInfo && this.primaryLayer.timeInfo.startTimeField) {
                                var timeInfo = this.primaryLayer.timeInfo;
                                var field = timeInfo.startTimeField;
                                if (field) {
                                    this.dateField = field;
                                    obj.dateField = field;
                                } else {
                                    this.dateField = null;
                                    obj.dateField = null;
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
                                    this.primarydate();
                                }));  
                            }
                            this.layerInfos[this.label] = obj;
                        }
                        
                    } else {
                        html.set(this.primaryDate, '');
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