///////////////////////////////////////////////////////////////////////////
// Copyright © 2016 Esri. All Rights Reserved.
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
    'dojo/dom',
    'dojo/dom-construct',
    'dojo/dom-style',
    'dijit/registry',
    'jimu/BaseWidgetSetting',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/form/Select'
],
        function (
                declare,
                dom,
                domConstruct,
                domStyle,
                registry,
                BaseWidgetSetting,
                _WidgetsInTemplateMixin,
                Select) {
            return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
                baseClass: 'jimu-widget-ISImageDate-setting',
                ISLayers: [],
                bandNames: [],
                requestFlag: true,
                startup: function () {
                    this.inherited(arguments);
                    domConstruct.place('<img id="loadingISImageDate" style="position: absolute;top:0;bottom: 0;left: 0;right: 0;margin:auto;z-index:100;" src="' + require.toUrl('jimu') + '/images/loading.gif">', this.domNode);
                    domStyle.set("loadingISImageDate", 'display', 'none');
                    this.populatePage();
                    this.setConfig(this.config);
                },
                postCreate: function () {
                    this.inherited(arguments);
                    var i = 0, j = 0;
                    for (var a in this.map.layerIds) {
                        if (this.map.getLayer(this.map.layerIds[a]).type === 'ArcGISImageServiceLayer' || (this.map.getLayer(this.map.layerIds[a]).serviceDataType && this.map.getLayer(this.map.layerIds[a]).serviceDataType.substr(0, 16) === "esriImageService")) {
                            var title = (this.map.getLayer(this.map.layerIds[a])).arcgisProps ? (this.map.getLayer(this.map.layerIds[a])).arcgisProps.title : "";
                            if((title.charAt(title.length - 1)) !== "_"){//if (!((title.toLowerCase()).includes("_result"))) {
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
                                    this.ISLayers[i].title = this.nls.layer + i;
                                }
                                i++;
                            }
                        }
                    }
                },
                setConfig: function (config) {
                    this.config = config;
                    for (var a in this.ISLayers) {
                        var label = this.ISLayers[a].url.split('//')[1];
                        if (config[label]) {
                            if (config[label].dateField !== undefined) {
                                registry.byId("dateField_" + a).set('value', config[label].dateField);
                            }
                        }
                    }
                },
                getConfig: function () {
                    for (var a in this.ISLayers) {
                        var obj = {
                            dateField: registry.byId("dateField_" + a).get('value')
                        };
                        this.config[this.ISLayers[a].url.split('//')[1]] = obj;
                    }
                    return this.config;
                },
                populatePage: function () {
                    for (var a in this.ISLayers) {
                        var layerSetting = domConstruct.create("tbody", {
                            innerHTML: '<tr><td>' + this.ISLayers[a].title + '</td></tr>' +
                                    '<tr><td class="first">' + this.nls.dateField + '</td><td class="second">' +
                                    '<select id="dateField_' + a + '"></select>' +
                                    '</td></tr>'
                        });
                        domConstruct.place(layerSetting, dom.byId("setting-table"));
                        var dateField = new Select({
                            style: "margin:10px;"
                        }, "dateField_" + a).startup();
                    }
                    this.setValues();
                },
                setValues: function () {

                    for (var a = 0; a < this.ISLayers.length; a++) {
                        this._populateDropDown(registry.byId("dateField_" + a), this.ISLayers[a].fields, "esriFieldTypeDate", new RegExp(/acq[a-z]*[_]?Date/i));
                    }
                },
                _populateDropDown: function (node, fields, dataType, regExpr) {
                    var options = [{"label": this.nls.selectField, "value": ""}];
                    var j = 1;
                    var initialVal = "";
                    if (fields) {
                        for (var i in fields) {
                            if (fields[i].type === dataType) {
                                options[j] = {"label": fields[i].name, "value": fields[i].name};
                                var str = fields[i].name;
                                if (initialVal === "" && regExpr.test(str)) {
                                    initialVal = str;
                                }
                                j++;
                            }
                        }
                    }
                    node.addOption(options);
                    node.set('value', initialVal);
                }

            });
        });
