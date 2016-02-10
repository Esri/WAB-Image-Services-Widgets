///////////////////////////////////////////////////////////////////////////
// Copyright (c) 2013 Esri. All Rights Reserved.
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
  "dojo/on",
  "dijit/registry",
  "dojo/_base/lang",
  "dojo/dom",
  "esri/layers/RasterFunction",
  "dojo/html",
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
                on,
                registry,
                lang,
                dom,
                RasterFunction,
                html,
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
              registry.byId("changeDetectionApply").on("click", lang.hitch(this, this.detectChange));
              if (this.map) {
                this.map.on("update-end", lang.hitch(this, this.refreshData));
                this.map.on("update-start", lang.hitch(this, this.showLoading));
                this.map.on("update-end", lang.hitch(this, this.hideLoading));
              }
            },
            detectChange: function () {
              var raster1, raster2, raster2, raster3, args1 = {}, args2 = {}, args = {}, changeDetectionLayer, params;

              if (this.map.getLayer("resultLayer")) {
                this.map.removeLayer(this.map.getLayer('resultLayer'));
                this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 1]);
                this.secondaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 2]);
              }
              domStyle.set("changeDetectionDisplay", "display", "block");
              html.set(this.setPrimarySecondaryLayers, "");

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
              esri.show(dom.byId("loadingChangeDetection"));
            },
            hideLoading: function () {
              esri.hide(dom.byId("loadingChangeDetection"));
            }
          });
          clazz.hasLocale = false;
          clazz.hasSettingPage = false;
          clazz.hasSettingUIFile = false;
          clazz.hasSettingLocale = false;
          clazz.hasSettingStyle = false;
          return clazz;
        });