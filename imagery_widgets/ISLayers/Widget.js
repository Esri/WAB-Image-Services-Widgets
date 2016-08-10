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
  "esri/arcgis/utils",
  "dijit/registry",
  "dojo/_base/lang",
  'dojo/dom-construct',
  "esri/request",
  "esri/layers/RasterFunction",
  "esri/layers/MosaicRule",
  "esri/layers/ArcGISImageServiceLayer",
  "esri/layers/ImageServiceParameters",
  "dojo/dom-construct",
  "dojo/dom-style",
  "dojo/html",
  "dojo/i18n!./nls/strings",
  "esri/arcgis/Portal",
  "esri/dijit/PopupTemplate",
  "dojox/json/ref",
  "dijit/form/Select",
  "dijit/form/Button",
  "dijit/form/NumberSpinner",
  "dijit/form/CheckBox",
  "dijit/form/TextBox",
  "dijit/form/DropDownButton",
  "dijit/TooltipDialog"

],
        function (
                declare,
                _WidgetsInTemplateMixin,
                template,
                BaseWidget,
                arcgisUtils,
                registry,
                lang,
                domConstruct,
                esriRequest,
                RasterFunction,
                MosaicRule,
                ArcGISImageServiceLayer,
                ImageServiceParameters,
                domConstruct, domStyle, html, strings, arcgisPortal, PopupTemplate) {
          var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {
            templateString: template,
            name: 'ISLayers',
            baseClass: 'jimu-widget-ISLayers',
            layerInfos: [],
            primaryLayerIndex: null,
            secondaryLayerIndex: null,
            primaryLayer: null,
            secondaryLayer: null,
            layerSwipe: null,
            layerList: null,
            saveResult: null,
            position: null,
            startup: function () {
              this.inherited(arguments);
              domConstruct.place('<img id="loadingIsLayers" style="position: absolute;top:0;bottom: 0;left: 0;right: 0;margin:auto;z-index:100;" src="' + require.toUrl('jimu') + '/images/loading.gif">', this.domNode);
              this.hideLoading();
            },
            postCreate: function () {
              this.populateServices();
              this.refreshData();
              if (this.resultLayer) {
                registry.byId("resultShow").set("checked", this.resultLayer.visible);
              }
              if (this.primaryLayer) {
                registry.byId("primaryShow").set("checked", this.primaryLayer.visible);
              }
              if (this.secondaryLayer) {
                registry.byId("secondaryShow").set("checked", this.secondaryLayer.visible);
              }

              domConstruct.place("<div id='swipewidget'></div>", "map", "after");
              registry.byId("imageView").on("change", lang.hitch(this, this.createLayer));
              registry.byId("secondary").on("change", lang.hitch(this, this.createSecondary));
              registry.byId("secondaryBtn").on("click", lang.hitch(this, this.makeSecondary));
              registry.byId("toggleLayers").on("click", lang.hitch(this, this.toggleLayers));
              registry.byId("primaryShow").on("change", lang.hitch(this, this.primaryVisibility));
              registry.byId("secondaryShow").on("change", lang.hitch(this, this.secondaryVisibility));
              registry.byId("resultShow").on("change", lang.hitch(this, this.resultVisibility));
             
              registry.byId("saveIconBtn").on("click", lang.hitch(this, this.selectSaveORAdd));
              registry.byId('saveBtn').on("click", lang.hitch(this, this.saveResultLayerCheck));
              registry.byId('yes').on("click", lang.hitch(this, this.saveResultLayerName, true));
              registry.byId('no').on("click", lang.hitch(this, this.saveResultLayerName, false));
              registry.byId("saveToArcGIS").on("click", lang.hitch(this, this.savingLayerToArcGIS));
              registry.byId("addBtn").on("click", lang.hitch(this, this.saveResultLayer));
              registry.byId("submitBtn").on("click", lang.hitch(this, this.savingLayerToArcGISContinues));
              if (this.map) {
                this.map.on("update-end", lang.hitch(this, this.refreshData));
                this.map.on("update-start", lang.hitch(this, this.showLoading));
                this.map.on("update-end", lang.hitch(this, this.hideLoading));
              }
            },
            onOpen: function () {
              
              this.refreshData();
            },
            onClose: function () {
              domStyle.set("loadingIsLayers","display","none");  
            },
            selectSaveORAdd: function () {
              registry.byId("saveDialog").show();
              domStyle.set("saveDialogContent", "display", "none");
              domStyle.set("saveOrAdd", "display", "block");
              domStyle.set("askingItemId", "display", "none");
            },
            savingLayerToArcGIS: function () {
              registry.byId("saveDialog").show();
              domStyle.set("saveDialogContent", "display", "none");
              domStyle.set("saveOrAdd", "display", "none");
              domStyle.set("askingItemId", "display", "block");
            },
            savingLayerToArcGISContinues: function () {
              registry.byId("saveDialog").hide();
              var resultLayerProperties = this.map.getLayer("resultLayer");
              var extent = this.map.geographicExtent.xmin + "," + this.map.geographicExtent.ymin + "," + this.map.geographicExtent.xmax + "," + this.map.geographicExtent.ymax;
              var spatialReference = this.map.extent.spatialReference.wkid;
              var renderingRule = resultLayerProperties.renderingRule.toJson();
              var itemData = {"operationalLayers": [{"id": resultLayerProperties.id, "layerType": "ArcGISImageServiceLayer", "url": resultLayerProperties.url, "visibility": true, "bandIds": [], "opacity": 1, "title": registry.byId("itemTitle").get("value"), "timeAnimation": false, "renderingRule": renderingRule}], "baseMap": {"baseMapLayers": [{"id": "defaultBasemap_0", "layerType": "ArcGISTiledMapServiceLayer", "opacity": 1, "visibility": true, "url": "http://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer"}], "title": "Topographic"}, "spatialReference": {"wkid": 102100, "latestWkid": 3857}, "version": "2.1"};
              var json = dojox.json.ref.toJson(itemData);
              var portal = new arcgisPortal.Portal("http://www.arcgis.com");
              portal.signIn().then(lang.hitch(this, function (loggedInUser) {
                var url = loggedInUser.userContentUrl;
                var addItemRequest = esriRequest({
                  url: url + "/addItem",
                  content: {f: "json",
                    title: registry.byId("itemTitle").get("value"),
                    type: "Web Map",
                    description: registry.byId("itemDescription").get("value"),
                    tags: registry.byId("itemTags").get("value"),
                    extent: extent,
                    spatialReference: spatialReference
                  },
                  handleAs: "json",
                  callbackParamName: "callback"
                }, {usePost: true});
                addItemRequest.then(lang.hitch(this, function (response) {
                  var updateDataRequest = esriRequest({
                    url: loggedInUser.userContentUrl + "/items/" + response.id + "/update",
                    content: {f: "json",
                      text: json,
                      overwrite: true,
                      type: "Web Map"},
                    handleAs: "json",
                    callbackParamName: "callback"
                  }, {usePost: true});
                  updateDataRequest.then(lang.hitch(this, function (response2) {
                  }));
                }));
              }));
            },
            saveResultLayer: function () {
              registry.byId("saveDialog").show();
              domStyle.set("saveDialogContent", "display", "block");
              domStyle.set("saveOrAdd", "display", "none");
              domStyle.set("askingItemId", "display", "none");
              html.set(this.saveDialogText, "");
              if (this.map.getLayer("resultLayer")) {
                this.saveResult = this.map.getLayer("resultLayer");
              }
              for (var x = 0; x <= this.layerList.length - 1; x++)
              {
                if (this.saveResult === this.layerList[x]) {
                  html.set(this.saveDialogText, strings.layerSaved);
                }
              }
            },
            saveResultLayerCheck: function () {
              var lengthOfOptions, options;

              registry.byId("saveDialog").hide();
              if (this.saveResult !== null) {
                this.nameofLayer = registry.byId("saveName").get("value");
                options = registry.byId('imageView').getOptions();
                this.addLayer = true;
                for (var y = 0; y <= options.length - 1; y++) {
                  if ((this.nameofLayer === options[y].label)) {
                    this.position = y;
                    if (y >= this.layerwebMap) {
                      registry.byId("saveDialog").show();
                      domStyle.set("saveDialogContent", "display", "none");
                      domStyle.set("overWrite", "display", "block");
                      this.addLayer = false;
                      html.set(this.saveDialogText, "");
                    } else {
                      this.addLayer = false;
                      html.set(this.saveDialogText, strings.restricted);
                      this.saveResultLayerName(false);
                    }
                  }
                }
                if (this.addLayer) {
                  lengthOfOptions = options.length;
                  this.layerList.push(this.saveResult);
                  registry.byId("imageView").addOption({label: this.nameofLayer, value: "" + lengthOfOptions + ""});
                  registry.byId("secondary").addOption({label: this.nameofLayer, value: "" + lengthOfOptions + ""});
                }
              }
            },
            saveResultLayerName: function (save) {
              registry.byId("saveDialog").hide();
              domStyle.set("saveDialogContent", "display", "block");
              domStyle.set("overWrite", "display", "none");
              if (save) {
                this.layerList[this.position] = this.saveResult;
              }
              else {
                registry.byId("saveDialog").show();
              }
            },
            refreshData: function () {
              if (this.map.layerIds) {
                if (this.map.getLayer("resultLayer")) {
                  this.resultLayer = this.map.getLayer("resultLayer");
                  domStyle.set(this.result, "display", "block");
                  this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 2]);
                  this.secondaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 3]);
                  registry.byId("resultShow").set("checked", this.resultLayer.visible);
                } else {
                  this.resultLayer = '';
                  domStyle.set(this.result, "display", "none");
                  this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 1]);
                  this.secondaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 2]);
                }
                
              }
            },
            populateServices: function () {
              var mainLayers, getItem, j;
              if (this.map.webMapResponse) {
                mainLayers = this.map.webMapResponse.itemInfo.itemData.operationalLayers;
                if (mainLayers.length === 0) {
                  this.autoSelectFirstLayer = true;
                } else {
                  this.autoSelectFirstLayer = false;
                }
              }
              this.layerList = [];
              registry.byId("imageView").removeOption(registry.byId('imageView').getOptions());
              registry.byId("secondary").removeOption(registry.byId('secondary').getOptions());
              var k=0;
              for (var i = mainLayers.length -1; i >= 0; i--) {
               if(mainLayers[i].layerType && mainLayers[i].layerType === "ArcGISImageServiceLayer"){
                this.layerList[k] = mainLayers[i].layerObject;
                this.layerList[k].title = mainLayers[i].title;
                registry.byId("imageView").addOption({label: this.layerList[k].title, value: "" + k + ""});
                registry.byId("secondary").addOption({label: this.layerList[k].title, value: "" + k + ""});
              k++;
                    }
              }
              if (this.config.webmapId) {
                getItem = arcgisUtils.getItem(this.config.webmapId);
                getItem.then(lang.hitch(this, function (response) {
                  j = 0;
                  
                  for (var i = response.itemData.operationalLayers.length - 1; i >= 0; i--) {
                      if(response.itemData.operationalLayers[i].layerType && response.itemData.operationalLayers[i].layerType ==="ArcGISImageServiceLayer"){
                          
                    this.layerList.push(response.itemData.operationalLayers[i]);
                    registry.byId("imageView").addOption({label: response.itemData.operationalLayers[i].title, value: "" + (j + k) + ""});
                    registry.byId("secondary").addOption({label: response.itemData.operationalLayers[i].title, value: "" + (j + k) + ""});
                    j++;
                  }
              }
              
                  this.layerwebMap = this.layerList.length;
                  if (this.autoSelectFirstLayer) {
                    this.createLayer();
                    this.autoSelectFirstLayer = false;
                  }
                }));
              }
              
              if (!this.secondaryLayerIndex) {
                registry.byId("secondary").set('value', "1");
                this.secondaryLayerIndex = 1;
              }
            },
            createLayer: function () {
              var params, mosaicRule, renderingRule, popupInfo, firstLayer;
              if (this.primaryLayer) {
                this.map.removeLayer(this.primaryLayer);
              }
              this.primaryLayerIndex = registry.byId("imageView").get("value");
              params = new ImageServiceParameters();

              if (this.toggle) {
                if (this.secondaryBackup.mosaicRule) {
                  mosaicRule = new MosaicRule(this.secondaryBackup.mosaicRule);
                  params.mosaicRule = mosaicRule;
                }
                if (this.secondaryBackup.renderingRule) {
                  renderingRule = new RasterFunction(lang.clone(this.secondaryBackup.renderingRule));
                  params.renderingRule = renderingRule;
                }
                if (this.secondaryBackup.bandIds) {
                  params.bandIds = this.secondaryBackup.bandIds;
                }
                if (this.secondaryBackup.format) {
                  params.format = this.secondaryBackup.format;
                }
                if (this.secondaryBackup.interpolation) {
                  params.interpolation = this.secondaryBackup.interpolation;
                }
                firstLayer = new ArcGISImageServiceLayer(
                        this.layerList[this.primaryLayerIndex].url,
                        {
                          id: "primaryLayer",
                          imageServiceParameters: params,
                          opacity: this.secondaryBackup.opacity,
                          visible: registry.byId("primaryShow").get("checked"),
                          infoTemplate: this.secondaryBackup.infoTemplate
                        });
                        firstLayer.title = this.secondaryBackup.title;
              } else {
                if (this.layerList[this.primaryLayerIndex].mosaicRule) {
                  mosaicRule = new MosaicRule(this.layerList[this.primaryLayerIndex].mosaicRule);
                  params.mosaicRule = mosaicRule;
                }
                if (this.layerList[this.primaryLayerIndex].renderingRule) {
                  renderingRule = new RasterFunction(lang.clone(this.layerList[this.primaryLayerIndex].renderingRule));
                  params.renderingRule = renderingRule;
                }
                if (this.layerList[this.primaryLayerIndex].bandIds) {
                  params.bandIds = this.layerList[this.primaryLayerIndex].bandIds;
                }
                if (this.layerList[this.primaryLayerIndex].format) {
                  params.format = this.layerList[this.primaryLayerIndex].format;
                }
                if (this.layerList[this.primaryLayerIndex].interpolation) {
                  params.interpolation = this.layerList[this.primaryLayerIndex].interpolation;
                }
                popupInfo = "";
                if (this.layerList[this.primaryLayerIndex].popupInfo) {
                  popupInfo = new PopupTemplate(this.layerList[this.primaryLayerIndex].popupInfo);
                }
                firstLayer = new ArcGISImageServiceLayer(
                        this.layerList[this.primaryLayerIndex].url,
                        {
                          id: "primaryLayer",
                          imageServiceParameters: params,
                          visible: registry.byId("primaryShow").get("checked"),
                          infoTemplate: popupInfo
                        });
                        firstLayer.title =  this.layerList[this.primaryLayerIndex].title;
              }

              if (this.resultLayer) {
                this.map.addLayer(firstLayer, this.map.layerIds.length - 1);
                this.map.on("layer-add-result", lang.hitch(this, function () {
                  this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 2]);
                }));
              } else {
                this.map.addLayer(firstLayer, this.map.layerIds.length);
                this.map.on("layer-add-result", lang.hitch(this, function () {
                  this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 1]);
                }));
              }
              this.toggle = false;
            },
            makeSecondary: function () {
              this.toggle = true;
              this.primaryBackup = this.primaryLayer;
              this.secondaryLayerIndex = registry.byId("imageView").get("value");
              if (this.secondaryLayerIndex != registry.byId("secondary").get("value")) {
                registry.byId("secondary").set("value", "" + this.secondaryLayerIndex + "");
              } else {
                this.createSecondary();
              }
            },
            createSecondary: function () {
              var params, mosaicRule, renderingRule, secondLayer, popupInfo;
              if (this.secondaryLayer) {
                this.map.removeLayer(this.secondaryLayer);
              }
              params = new ImageServiceParameters();
              if (this.toggle) {
                if (this.primaryBackup.mosaicRule) {
                  mosaicRule = new MosaicRule(this.primaryBackup.mosaicRule);
                  params.mosaicRule = mosaicRule;
                }
                if (this.primaryBackup.renderingRule) {
                  renderingRule = new RasterFunction(lang.clone(this.primaryBackup.renderingRule));
                  params.renderingRule = renderingRule;
                }
                if (this.primaryBackup.bandIds) {
                  params.bandIds = this.primaryBackup.bandIds;
                }
                if (this.primaryBackup.format) {
                  params.format = this.primaryBackup.format;
                }
                if (this.primaryBackup.interpolation) {
                  params.interpolation = this.primaryBackup.interpolation;
                }
                secondLayer = new ArcGISImageServiceLayer(
                        this.primaryBackup.url,
                        {
                          id: "secondaryLayer",
                          imageServiceParameters: params,
                          opacity: this.primaryBackup.opacity,
                          visible: registry.byId("secondaryShow").get("checked"),
                          infoTemplate: this.primaryBackup.infoTemplate
                        });
                         secondLayer.title = this.primaryBackup.title;
              } else {
                this.secondaryLayerIndex = registry.byId("secondary").get("value");
                if (this.layerList[this.secondaryLayerIndex].mosaicRule) {
                  mosaicRule = new MosaicRule(this.layerList[this.secondaryLayerIndex].mosaicRule);
                  params.mosaicRule = mosaicRule;
                }
                if (this.layerList[this.secondaryLayerIndex].renderingRule) {
                  renderingRule = new RasterFunction(lang.clone(this.layerList[this.secondaryLayerIndex].renderingRule));
                  params.renderingRule = renderingRule;
                }
                if (this.layerList[this.secondaryLayerIndex].bandIds) {
                  params.bandIds = this.layerList[this.secondaryLayerIndex].bandIds;
                }
                if (this.layerList[this.secondaryLayerIndex].format) {
                  params.format = this.layerList[this.secondaryLayerIndex].format;
                }
                if (this.layerList[this.secondaryLayerIndex].interpolation) {
                  params.interpolation = this.layerList[this.secondaryLayerIndex].interpolation;
                }
                popupInfo = "";
                if (this.layerList[this.secondaryLayerIndex].popupInfo) {
                  popupInfo = new PopupTemplate(this.layerList[this.secondaryLayerIndex].popupInfo);
                }
                secondLayer = new ArcGISImageServiceLayer(
                        this.layerList[this.secondaryLayerIndex].url,
                        {
                          id: "secondaryLayer",
                          imageServiceParameters: params,
                           visible: registry.byId("secondaryShow").get("checked"),
                          infoTemplate: popupInfo
                        });
              secondLayer.title = this.layerList[this.secondaryLayerIndex].title;
                }
              
              if (this.resultLayer) {
                this.map.addLayer(secondLayer, this.map.layerIds.length - 2);
                this.map.on("layer-add-result", lang.hitch(this, function () {
                  this.secondaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 3]);
                }));
              } else {
                this.map.addLayer(secondLayer, this.map.layerIds.length - 1);
                this.map.on("layer-add-result", lang.hitch(this, function () {
                  this.secondaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 2]);
                }));
              }
              this.toggle = false;
            },
            toggleLayers: function () {
              var secondaryIndex, primaryIndex;
              if (registry.byId("secondary").get("value")) {
                this.toggle = true;
                secondaryIndex = this.secondaryLayerIndex;
                this.secondaryBackup = this.secondaryLayer;
                primaryIndex = this.primaryLayerIndex;
                this.primaryBackup = this.primaryLayer;
                if (secondaryIndex !== registry.byId("imageView").get("value")) {
                  registry.byId("imageView").set("value", "" + secondaryIndex + "");
                } else {
                  this.createLayer();
                }
                if (primaryIndex !== registry.byId("secondary").get("value")) {
                  registry.byId("secondary").set("value", "" + primaryIndex + "");
                } else {
                  this.createSecondary();
                }
              }
            },
            primaryVisibility: function () {
              if (registry.byId("primaryShow").get("checked")) {
                this.primaryLayer.show();
              } else {
                this.primaryLayer.hide();
              }
            },
            secondaryVisibility: function () {
              if (registry.byId("secondaryShow").get("checked")) {
                this.secondaryLayer.show();
              } else {
                this.secondaryLayer.hide();
              }
            },
            resultVisibility: function () {
              if (registry.byId("resultShow").get("checked")) {
                this.resultLayer.show();
              } else {
                this.resultLayer.hide();
              }
            },
            showLoading: function () {
              domStyle.set("loadingIsLayers","display","block");
            },
            hideLoading: function () {
              domStyle.set("loadingIsLayers","display","none");
            }
          });
          clazz.hasLocale = false;
          return clazz;
        });