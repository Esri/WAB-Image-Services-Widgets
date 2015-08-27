///////////////////////////////////////////////////////////////////////////
// Copyright (c) 2015 Esri. All Rights Reserved.
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
  "dojo/dom-construct",
  "esri/dijit/LayerSwipe",
  "dojo/dom-style",
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
                registry,
                lang,
                dom,
                domConstruct,
                LayerSwipe, domStyle) {
          var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {
            templateString: template,
            name: 'ISSplitTool',
            baseClass: 'jimu-widget-ISSplitTool',
            primaryLayer: null,
            secondaryLayer: null,
            layerswipeHorizontal: null,
            layerswipeVertical: null,
            startup: function () {
              this.inherited(arguments);
              domConstruct.place('<img id="loadingSplitTool" style="position: absolute;top:0;bottom: 0;left: 0;right: 0;margin:auto;z-index:100;" src="' + require.toUrl('jimu') + '/images/loading.gif">', this.domNode);
              this.hideLoading();
            },
            onOpen: function () {
              this.refreshData();
            },
            refreshData: function () {
              if (this.map.layerIds) {
                if (this.map.getLayer("resultLayer")) {
                  this.resultLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 1]);
                  this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 2]);
                  this.secondaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 3]);
                  domStyle.set("errorDisplay", "display", "none");
                  domStyle.set("splitToolContent", "display", "block");
                } else {
                  domStyle.set("errorDisplay", "display", "block");
                  domStyle.set("splitToolContent", "display", "none");
                }
              }
            },
            onClose: function () {
              this.layerswipeVertical.destroy();
              this.layerswipeVertical = null;
              this.layerswipeHorizontal.destroy();
              this.layerswipeHorizontal = null;
              registry.byId("splitTool").set("checked", false);
            },
            postCreate: function () {
              registry.byId("splitTool").on("change", lang.hitch(this, this.setSwipe));
              if (this.map) {
                this.map.on("update-end", lang.hitch(this, this.refreshData));
                this.map.on("update-start", lang.hitch(this, this.showLoading));
                this.map.on("update-end", lang.hitch(this, this.hideLoading));
              }
            },
            setSwipe: function () {
              if (registry.byId("splitTool").get("checked")) {
                domConstruct.place("<div id='swipewidgetVertical'></div>", "map", "after");
                domConstruct.place("<div id='swipewidgetHorizontal'></div>", "map", "after");

                this.layerswipeVertical = new LayerSwipe({
                  type: "vertical",
                  map: this.map,
                  layers: [this.primaryLayer]
                }, dom.byId("swipewidgetVertical"));
                this.layerswipeVertical.startup();

                this.layerswipeHorizontal = new LayerSwipe({
                  type: "horizontal",
                  top: 500,
                  map: this.map,
                  layers: [this.resultLayer]
                }, dom.byId("swipewidgetHorizontal"));
                this.layerswipeHorizontal.startup();
              } else {
                if (this.layerswipeVertical != null) {
                  this.layerswipeVertical.destroy();
                }
                if (this.layerswipeHorizontal != null)
                {
                  this.layerswipeHorizontal.destroy();
                }
              }
            },
            showLoading: function () {
              esri.show(dom.byId("loadingSplitTool"));
            },
            hideLoading: function () {
              esri.hide(dom.byId("loadingSplitTool"));
            }
          });
          clazz.hasLocale = false;
          clazz.hasSettingPage = false;
          clazz.hasSettingUIFile = false;
          clazz.hasSettingLocale = false;
          clazz.hasSettingStyle = false;
          return clazz;
        });