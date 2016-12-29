///////////////////////////////////////////////////////////////////////////
// Copyright (c) 2016 Esri. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
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
  'dojo/text!./Widget.html',
  'jimu/BaseWidget',
  "dijit/registry",
  "dojo/_base/lang",
  "dojo/dom",
  "esri/layers/RasterFunction",
  "dojo/html","esri/request",
  "esri/layers/ArcGISImageServiceLayer",
  "esri/layers/ImageServiceParameters",
  "dojo/dom-construct",
  "dojo/i18n!./nls/strings",
  "dojo/dom-style",
  "dijit/form/Select",
  "dijit/form/Button",
  "dijit/form/NumberSpinner",
  "dijit/form/CheckBox",
  "dijit/form/TextBox",
  "dijit/form/DropDownButton",
  "dijit/TooltipDialog",
  "dijit/form/NumberTextBox"

],
        function (
                declare,
                _WidgetsInTemplateMixin,
                template,
                BaseWidget,
                registry,
                lang,
                dom,
                RasterFunction,
                html,esriRequest,
                ArcGISImageServiceLayer,
                ImageServiceParameters,
                domConstruct,strings, domStyle) {
          
          var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {
            templateString: template,
            name: 'ISChangeDetection',
            baseClass: 'jimu-widget-ISChangeDetection',
            primaryLayer: null,
            secondaryLayer: null,
            conversionparameters : [0.299, 0.387, 0.314],
            startup: function () {
              this.inherited(arguments);
              domConstruct.place('<img id="loadingChangeDetection" style="position: absolute;top:0;bottom: 0;left: 0;right: 0;margin:auto;z-index:100;" src="' + require.toUrl('jimu') + '/images/loading.gif">', this.domNode);
              this.hideLoading();
            },
            onOpen: function () {
              this.refreshData();
            },
            refreshData: function () {
              if (this.map.layerIds) {
                if (this.map.getLayer("resultLayer")) {
                  this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 2]);
                  this.secondaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 3]);
                } else {
                  this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 1]);
                  this.secondaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 2]);
                }
                if (this.secondaryLayer !== undefined && this.primaryLayer !== undefined) {
                  if ((this.primaryLayer.mosaicRule !== null) && (this.primaryLayer.mosaicRule.lockRasterIds !== null) && (this.secondaryLayer.mosaicRule !== null) && (this.secondaryLayer.mosaicRule.lockRasterIds !== null)) {
                    domStyle.set("changeDetectionDisplay", "display", "block");
                    html.set(this.setPrimarySecondaryLayers, "");
                    
                  } else {
                    domStyle.set("changeDetectionDisplay", "display", "none");
                    html.set(this.setPrimarySecondaryLayers, strings.error);
                  }
                } else {
                  domStyle.set("changeDetectionDisplay", "display", "none");
                  html.set(this.setPrimarySecondaryLayers, strings.error);
                }
              }
            },
            postCreate: function () {
                registry.byId("method").on("change", lang.hitch(this, function(value){
                    if(value === "difference")
                        domStyle.set("bandInputs","display","none");
                    else{
                        if(value === "ndvi" || value === "savi"){
                            document.getElementById("bandName1").innerHTML  = "Infrared Band";
                            document.getElementById("bandName2").innerHTML = "Red Band";
                        }else if(value === "water"){
                            document.getElementById("bandName1").innerHTML  = "Green Band";
                            document.getElementById("bandName2").innerHTML = "Short-wave Infrared Band";
                        }else{
                            document.getElementById("bandName1").innerHTML  = "Infrared Band";
                            document.getElementById("bandName2").innerHTML = "Short-wave Infrared Band";
                        }
                        domStyle.set("bandInputs","display","block");
                    }
                }));
              registry.byId("changeDetectionApply").on("click", lang.hitch(this, this.getMinMaxCheck));
              if (this.map) {
                this.map.on("update-end", lang.hitch(this, this.refreshData));
                this.map.on("update-start", lang.hitch(this, this.showLoading));
                this.map.on("update-end", lang.hitch(this, this.hideLoading));
              }
            },
            getMinMaxCheck: function(){
                var method = registry.byId("method").get("value");
                if(method !== "difference"){
                var request = new esriRequest({
                       url: this.primaryLayer.url,
                       content:{
                           f:"json"
                       },
                        handleAs: "json",
                            callbackParamName: "callback"
                    });
                    request.then(lang.hitch(this, function(prop){
                        var band1Index = Math.abs(parseInt(registry.byId("band1").get("value")));
                        var band2Index = Math.abs(parseInt(registry.byId("band2").get("value")));
                       
                        if(prop.minValues && prop.minValues.length > 0 && prop.minValues[0] && prop.minValues.length > band1Index){
                            this.min1 = prop.minValues[band1Index];
                            this.min2  = prop.minValues[band2Index];
                        }else {
                            this.min1 = 0;
                            this.min2 = 0;
                        }
                        if(prop.maxValues && prop.maxValues.length > 0 && prop.maxValues[0] && prop.maxValues.length > band1Index){
                            this.max1 = prop.maxValues[band1Index];
                            this.max2  = prop.maxValues[band2Index];
                        }else {
                            this.max1 = 1;
                            this.max2 = 1;
                        }
                        this.detectChange();
                    }), lang.hitch(this, function(){
                        this.min1= 0;
                        this.max1 = 1;
                        this.min2 = 0;
                        this.max2 = 1;
                        this.detectChange();
                    })); 
                }else
                    this.detectChange();
            },
            detectChange: function () {
                
              var raster1, raster2, raster2, raster3, args1 = {}, args2 = {}, args = {}, changeDetectionLayer, params;
              var method = registry.byId("method").get("value");
              if (this.map.getLayer("resultLayer")) {
                this.map.removeLayer(this.map.getLayer('resultLayer'));
                this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 1]);
                this.secondaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 2]);
              }
              domStyle.set("changeDetectionDisplay", "display", "block");
              html.set(this.setPrimarySecondaryLayers, "");
              if(method === "difference") {
              raster1 = new RasterFunction();
              raster1.functionName = "Grayscale";
              args1.Raster = "$" + this.primaryLayer.mosaicRule.lockRasterIds;
              args1.ConversionParameters = this.conversionparameters;
              raster1.functionArguments = args1;

              raster2 = new RasterFunction();
              raster2.functionName = "Grayscale";
              args2.Raster = "$" + this.secondaryLayer.mosaicRule.lockRasterIds;
              args2.ConversionParameters = this.conversionparameters;
              raster2.functionArguments = args2;

              raster3 = new RasterFunction();
              raster3.functionName = "Arithmetic";
              raster3.OutputPixelType = "U8";
              args.Raster = raster1;
              args.Raster2 = raster2;
              args.Operation = "2";
              args.ExtentType = 0;
              args.CellsizeType = 1;
              raster3.functionArguments = args;
          }else {
            
              var band1 = "B" + (Math.abs(parseInt(registry.byId("band1").get("value"))) + 1);
              var band2 = "B" +(Math.abs(parseInt(registry.byId("band2").get("value"))) + 1);
              var value1 = this.max1 - this.min1;
              var value2 = this.max2- this.min2;
             
              
              if(method !== "savi"){
                  var indexFormula = "(("+value2+"*("+band1+"-"+this.min1+"))+("+value1+"*("+this.min2+"-"+band2+")))/(("+value2+"*("+band1+"-"+this.min1+"))+("+value1+"*("+band2+"-"+this.min2+")))";
              }else{
                  var indexFormula = "1.5 * (("+value2+"*("+band1+"-"+this.min1+"))+("+value1+"*("+this.min2+"-"+band2+")))/(("+value2+"*("+band1+"-"+this.min1+"))+("+value1+"*("+band2+"-"+this.min2+"))+(0.5*"+value1+"*"+value2+"))";
              }
             
              raster1 = new RasterFunction();
              raster1.functionName = "BandArithmetic";
              args1.Method = 0;
              args1.Raster = "$" + this.primaryLayer.mosaicRule.lockRasterIds;
              args1.BandIndexes = indexFormula;
              raster1.functionArguments = args1;
              raster1.outputPixelType  ="F32";
              
              raster2 = new RasterFunction();
              raster2.functionName = "BandArithmetic";
              args2.Method = 0;
              args2.Raster = "$" + this.secondaryLayer.mosaicRule.lockRasterIds;
              args2.BandIndexes = indexFormula;
              raster2.functionArguments = args2;
              raster2.outputPixelType  ="F32";
              
               raster3 = new RasterFunction();
              raster3.functionName = "CompositeBand";
              raster3.outputPixelType = "F32";
              args.Rasters = [raster2,raster1, raster2];
              raster3.functionArguments = args;
              
              var stretch = new RasterFunction();
              stretch.functionName = "Stretch";
              stretch.outputPixelType = "U8";
              var stretchArg = {};
              stretchArg.StretchType = 3;
              stretchArg.NumberOfStandardDeviations = 3;
              stretchArg.DRA = true;
              stretchArg.Min = 0;
              stretchArg.Max =255;
              stretchArg.Raster  = raster3;
              stretch.functionArguments = stretchArg;
              raster3 = stretch;
          }
     
          
              params = new ImageServiceParameters();
              params.renderingRule = raster3;
              changeDetectionLayer = new ArcGISImageServiceLayer(
                      this.primaryLayer.url,
                      {
                        id: "resultLayer",
                        imageServiceParameters: params
                      });
              this.map.addLayer(changeDetectionLayer);
            },
            showLoading: function () {
             domStyle.set("loadingChangeDetection","display","block");
            },
            hideLoading: function () {
              domStyle.set("loadingChangeDetection","display","none");
            }
          });
          clazz.hasLocale = false;
          clazz.hasSettingPage = false;
          clazz.hasSettingUIFile = false;
          clazz.hasSettingLocale = false;
          clazz.hasSettingStyle = false;
          return clazz;
        });