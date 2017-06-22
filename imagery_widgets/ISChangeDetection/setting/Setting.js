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
    'jimu/BaseWidgetSetting', "dojo/dom-construct", "dojo/dom", "dijit/registry", "dijit/form/CheckBox"
],
        function (
                declare,
                _WidgetsInTemplateMixin,
                BaseWidgetSetting, domConstruct, dom, registry, CheckBox
                ) {

            return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
                //these two properties is defined in the BaseWidget
                ISLayers: [],
                startup: function () {
                    this.inherited(arguments);
                    this.populatePage();
                    this.setConfig(this.config);
                },
                postCreate: function () {
                    this.inherited(arguments);
                    var i = 0, j = 0;
                    for (var a in this.map.layerIds) {
                        if (this.map.getLayer(this.map.layerIds[a]).type === 'ArcGISImageServiceLayer' || (this.map.getLayer(this.map.layerIds[a]).serviceDataType && this.map.getLayer(this.map.layerIds[a]).serviceDataType.substr(0, 16) === "esriImageService")) {
                            var title = (this.map.getLayer(this.map.layerIds[a])).arcgisProps ? (this.map.getLayer(this.map.layerIds[a])).arcgisProps.title : "";
                           if(title.charAt(title.length - 1) !== "_"){// if (!((title.toLowerCase()).includes("_result"))) {
                                this.ISLayers[i] = this.map.getLayer(this.map.layerIds[a]);
                                while (this.map.itemInfo.itemData.operationalLayers[j] && this.map.itemInfo.itemData.operationalLayers[j].url !== this.ISLayers[i].url) {
                                    j++;
                                }
                                if (this.map.itemInfo.itemData.operationalLayers[j] && this.map.itemInfo.itemData.operationalLayers[j].title)
                                    this.ISLayers[i].title = this.map.itemInfo.itemData.operationalLayers[j].title;
                                else if (this.map.getLayer(this.map.layerIds[a]).name) {
                                    this.ISLayers[i].title = this.map.getLayer(this.map.layerIds[a]).name;
                                } else if (this.map.getLayer(this.map.layerIds[a]).id) {
                                    this.ISLayers[i].title = this.map.getLayer(this.map.layerIds[a]).id;
                                } else {
                                    this.ISLayers[i].title = "Layer" + i;
                                }
                                i++;
                            }
                        }
                    }
                },
                populatePage: function () {
                    for (var a in this.ISLayers) {
                        var layerSetting = domConstruct.create("tbody", {
                            innerHTML: '<tr><br><td>' + this.ISLayers[a].title + '</td></tr>' +
                                    '<tr><br /><td class="first"><input id="veg_' + a + '" /><label for="veg_' + a + '">Vegetation Index</label></td><td class="first">' +
                                    '<input id="savi_' + a + '" /><label for="savi_' + a + '">Soil Adjusted Vegetation Index</label>' +
                                    '</td><td class="first"><input id="water_' + a + '" /><label for="water_' + a + '">Water Index</label></td><td class="first">' +
                                    '<input id="burn_' + a + '" /><label for="burn_' + a + '">Burn Index</label></td></tr>'
                        });
                        domConstruct.place(layerSetting, dom.byId("setting-table"));
                        var vegIndex = new CheckBox({
                            style: ""
                        }, "veg_" + a).startup();
                        var saviIndex = new CheckBox({
                            style: "margin-left:10px;"
                        }, "savi_" + a).startup();
                        var waterIndex = new CheckBox({
                            style: "margin-left:10px;"
                        }, "water_" + a).startup();
                        var burnIndex = new CheckBox({
                            style: "margin-left:10px;"
                        }, "burn_" + a).startup();
                    }

                },
                setConfig: function (config) {
                    this.config = config;
                },
                getConfig: function () {
                    for (var a in this.ISLayers) {
                        var obj = {
                            veg: registry.byId("veg_" + a).get('checked'),
                            savi: registry.byId("savi_" + a).get('checked'),
                            water: registry.byId("water_" + a).get('checked'),
                            burn: registry.byId("burn_" + a).get('checked'),
                            title: this.ISLayers[a].title
                        };
                        this.config[this.ISLayers[a].url.split('//')[1]] = obj;
                    }
                    return this.config;
                }


            });
        });