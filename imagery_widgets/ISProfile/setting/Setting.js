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
    'dojo/_base/lang',
    'dojo/_base/html',
    'dojo/dom',
    'dojo/dom-construct',
    'dojo/dom-style',
    'dojo/keys',
    'jimu/BaseWidgetSetting',
    'jimu/dijit/Popup',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/registry',
    'esri/request',
    'esri/arcgis/utils',
    'dijit/form/CheckBox',
    'dijit/form/ValidationTextBox',
    'dijit/form/Select',
    'dijit/form/Textarea'
],
        function (
                declare,
                lang,
                html,
                dom,
                domConstruct,
                domStyle,
                keys,
                BaseWidgetSetting,
                Popup,
                _WidgetsInTemplateMixin,
                registry,
                esriRequest,
                arcgisUtils,
                CheckBox,
                ValidationTextBox,
                Select, Textarea) {
            return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
                baseClass: 'jimu-widget-ISSpectralProfile-setting',
                ISLayers: [],
                bandNames: [],
                requestFlag: true,
                startup: function () {
                    this.inherited(arguments);
                    domConstruct.place('<img id="loadingSpectralProfile" style="position: absolute;top:0;bottom: 0;left: 0;right: 0;margin:auto;z-index:100;" src="' + require.toUrl('jimu') + '/images/loading.gif">', this.domNode);
                    domStyle.set("loadingSpectralProfile", 'display', 'none');
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
                                this.ISLayers[i].title = "Layer" + i;
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
                            if (config[label].hasNDVI !== undefined) {
                                registry.byId("ndvi_" + a).set('checked', config[label].hasNDVI);
                            }
                            if (config[label].hasOverlap !== undefined) {
                                registry.byId("overlap_" + a).set('checked', config[label].hasOverlap);
                            }
                            if (config[label].bandCount !== undefined) {
                                registry.byId("bandCount_" + a).set('value', config[label].bandCount);
                            }
                            if (config[label].bandNames !== undefined) {
                                var val;
                                for (var i in config[label].bandNames) {
                                    if (registry.byId("bandNames_" + a).get('value')) {
                                        val = registry.byId("bandNames_" + a).get('value') + "," + config[label].bandNames[i];
                                    } else {
                                        val = config[label].bandNames[i];
                                    }
                                    registry.byId("bandNames_" + a).set('value', val);
                                }
                                registry.byId("bandNames_" + a).set('value', config[label].bandNames);
                            }
                            if (config[label].category !== undefined) {
                                registry.byId("category_" + a).set('value', config[label].category);
                            }
                            if (config[label].acquisitionDate !== undefined) {
                                registry.byId("acquisitionDate_" + a).set('value', config[label].acquisitionDate);
                            }
                            if (config[label].nirIndex !== undefined) {
                                registry.byId("nirIndex_" + a).set('value', config[label].nirIndex);
                            }
                            if (config[label].redIndex !== undefined) {
                                registry.byId("redIndex_" + a).set('value', config[label].redIndex);
                            }
                            if (config[label].swirIndex !== undefined) {
                                registry.byId("swirIndex_" + a).set('value', config[label].swirIndex);
                            }
                        }
                    }
                },
                getConfig: function () {
                    for (var a in this.ISLayers) {
                        this.bandNames = registry.byId("bandNames_" + a).get('value').split(',');
                        var obj = {
                            hasOverlap: registry.byId("overlap_" + a).get('checked'),
                            hasNDVI: registry.byId("ndvi_" + a).get('checked'),
                            ndvi: registry.byId("ndvi_" + a).get('checked'),
                            ndmi: registry.byId("ndvi_" + a).get('checked'),
                            urban: registry.byId("ndvi_" + a).get('checked'),
                            yAxisLabel: registry.byId("yAxisLabel_"+a).get("value") ? registry.byId("yAxisLabel_"+a).get("value") : "Data Values",
                            bandCount: parseInt(registry.byId("bandCount_" + a).get('value')),
                            bandNames: this.bandNames,
                            field: registry.byId("acquisitionDate_" + a).get('value'),
                            category: registry.byId("category_" + a).get('value'),
                            nirIndex: parseInt(registry.byId("nirIndex_" + a).get('value')),
                            redIndex: parseInt(registry.byId("redIndex_" + a).get('value')),
                            swirIndex: parseInt(registry.byId("swirIndex_" + a).get('value')),
                            title: this.ISLayers[a].title
                        };
                        if (obj.bandCount === 1) {
                            obj.hasNDVI = false;
                        }
                        if (registry.byId("acquisitionDate_" + a).get('value') === "") {
                            obj.hasOverlap = false;
                            obj.hasNDVI = false;
                        } else if (registry.byId("nirIndex_" + a).get('value') === "")
                            obj.hasNDVI = false;
                        else {
                            if (registry.byId("redIndex_" + a).get('value') === "") {
                                obj.ndvi = false;
                                obj.urban = false;
                            }
                            if (registry.byId("swirIndex_" + a).get('value') === "") {
                                obj.ndmi = false;
                                obj.urban = false;
                            }
                        }
                        this.config[this.ISLayers[a].url.split('//')[1]] = obj;
                    }
                    return this.config;
                },
                populatePage: function () {
                    for (var a in this.ISLayers) {
                        var layerSetting = domConstruct.create("tbody", {
                            innerHTML: '<tr><td>' + this.ISLayers[a].title + '</td></tr>' +
                                    '<tr><td class="first">Temporal Profile<input id="overlap_' + a + '"/>' +
                                    '</td><td class="first">Index Profile<input id="ndvi_' + a + '"/>' +
                                    '</td></tr>' + '<tr id="count_' + a + '"><td class="first">*Band Count</td><td class="second">' +
                                    '<input id="bandCount_' + a + '"/>' +
                                    '</td></tr>' + '<tr id="names_' + a + '" style="display:none;"><td class="first">*Band Names</td><td class="second">' +
                                    '<textarea id="bandNames_' + a + '"></textarea>' +
                                    '</td></tr>' + '<tr><td class="first">y-axis Label: </td><td class="second">' +
                                    '<textarea id="yAxisLabel_' + a + '"></textarea>' +
                                    '</td></tr>' + '<tr id="cat_' + a + '" style="display:none;"><td class="first">Category</td><td class="second">' +
                                    '<select id="category_' + a + '"></select>' +
                                    '</td></tr>' + '<tr id="acqDate_' + a + '" style="display:none;"><td class="first">*Field</td><td class="second">' +
                                    '<select id="acquisitionDate_' + a + '"></select>' +
                                    '</td></tr>' + '<tr id="nir_' + a + '" style="display:none;"><td class="first">Near-IR Band</td><td class="second">' +
                                    '<select id="nirIndex_' + a + '"></select>' +
                                    '</td></tr>' + '<tr id="red_' + a + '" style="display:none;"><td class="first">Red Band</td><td class="second">' +
                                    '<select id="redIndex_' + a + '"></select>' +
                                    '</td></tr>' + '<tr id="swir_' + a + '" style="display:none;"><td class="first">Shortwave-IR Band</td><td class="second">' +
                                    '<select id="swirIndex_' + a + '"></select>' +
                                    '</td></tr>'
                        });
                        domConstruct.place(layerSetting, dom.byId("setting-table"));
                        var yAxisLabel = new Textarea({
                            style: "margin:10px;"
                        }, "yAxisLabel_" + a).startup();
                        var category = new Select({
                            style: "margin:10px;"
                        }, "category_" + a).startup();
                        var acquisitionDate = new Select({
                            style: "margin:10px;"
                        }, "acquisitionDate_" + a).startup();
                        var nirIndex = new Select({
                            style: "margin:10px;",
                            options: [{"label": "No value", "value": ""}]
                        }, "nirIndex_" + a).startup();
                        var redIndex = new Select({
                            style: "margin:10px;",
                            options: [{"label": "No value", "value": ""}]
                        }, "redIndex_" + a).startup();
                        var swirIndex = new Select({
                            style: "margin:10px;",
                            options: [{"label": "No value", "value": ""}]
                        }, "swirIndex_" + a).startup();
                        var ndvi = new CheckBox({
                            style: "margin:10px;",
                            onChange: function (checked) {
                                if (checked) {
                                    domStyle.set(dom.byId("acqDate_" + this.id.slice(-1)), 'display', 'table-row');
                                    domStyle.set(dom.byId("red_" + this.id.slice(-1)), 'display', 'table-row');
                                    domStyle.set(dom.byId("nir_" + this.id.slice(-1)), 'display', 'table-row');
                                    domStyle.set(dom.byId("swir_" + this.id.slice(-1)), 'display', 'table-row');
                                } else {
                                    if (registry.byId("overlap_" + this.id.slice(-1)).get('value') === false) {
                                        domStyle.set(dom.byId("acqDate_" + this.id.slice(-1)), 'display', 'none');
                                    }
                                    domStyle.set(dom.byId("red_" + this.id.slice(-1)), 'display', 'none');
                                    domStyle.set(dom.byId("nir_" + this.id.slice(-1)), 'display', 'none');
                                    domStyle.set(dom.byId("swir_" + this.id.slice(-1)), 'display', 'none');
                                }
                            }
                        }, "ndvi_" + a).startup();
                        var overlap = new CheckBox({
                            style: "margin:10px;",
                            onChange: function (checked) {
                                if (checked) {
                                    domStyle.set(dom.byId("acqDate_" + this.id.slice(-1)), 'display', 'table-row');
                                } else {
                                    if (registry.byId("ndvi_" + this.id.slice(-1)).get('value') === false) {
                                        domStyle.set(dom.byId("acqDate_" + this.id.slice(-1)), 'display', 'none');
                                    }
                                }
                            }
                        }, "overlap_" + a).startup();
                        var bandCount = new ValidationTextBox({
                            required: true,
                            style: "margin:10px;"
                        }, "bandCount_" + a).startup();
                        var bandNames = new Textarea({
                            required: true,
                            title: "Enter names of all the bands separated by commas",
                            style: "margin:10px;",
                            onChange: function (value) {
                                registry.byId("nirIndex_" + this.id.slice(-1)).removeOption(registry.byId("nirIndex_" + this.id.slice(-1)).getOptions());
                                registry.byId("redIndex_" + this.id.slice(-1)).removeOption(registry.byId("redIndex_" + this.id.slice(-1)).getOptions());
                                registry.byId("swirIndex_" + this.id.slice(-1)).removeOption(registry.byId("swirIndex_" + this.id.slice(-1)).getOptions());
                                registry.byId("nirIndex_" + this.id.slice(-1)).addOption({"label": "No value", "value": ""});
                                registry.byId("redIndex_" + this.id.slice(-1)).addOption({"label": "No value", "value": ""});
                                registry.byId("swirIndex_" + this.id.slice(-1)).addOption({"label": "No value", "value": ""});
                                var j = 1;
                                var initialVal_nir = "";
                                var initialVal_red = "";
                                var initialVal_swir = "";
                                var nirExp = new RegExp(/N[a-z]*I[a-z]*R[_]?[1]?/i);
                                var redExp = new RegExp(/red/i);
                                var swirExp = new RegExp(/S[a-z]*W[a-z]*I[a-z]*R[_]?[1]?/i);
                                var bandName = value.split(',');
                                if (bandName) {
                                    for (var i in bandName) {
                                        registry.byId("nirIndex_" + this.id.slice(-1)).addOption({"label": j + " (" + bandName[i] + ")", "value": i});
                                        registry.byId("redIndex_" + this.id.slice(-1)).addOption({"label": j + " (" + bandName[i] + ")", "value": i});
                                        registry.byId("swirIndex_" + this.id.slice(-1)).addOption({"label": j + " (" + bandName[i] + ")", "value": i});
                                        if (initialVal_nir === "" && nirExp.test(bandName[i]))
                                        {
                                            initialVal_nir = i;
                                        }
                                        if (initialVal_red === "" && redExp.test(bandName[i]))
                                        {
                                            initialVal_red = i;
                                        }
                                        if (initialVal_swir === "" && swirExp.test(bandName[i]))
                                        {
                                            initialVal_swir = i;
                                        }
                                        j++;
                                    }
                                }
                                registry.byId("nirIndex_" + this.id.slice(-1)).set('value', initialVal_nir);
                                registry.byId("redIndex_" + this.id.slice(-1)).set('value', initialVal_red);
                                registry.byId("swirIndex_" + this.id.slice(-1)).set('value', initialVal_swir);
                            }
                        }, "bandNames_" + a).startup();
                    }
                    this.setValues();
                },
                loopRequest: function (a) {
                    this.saveValue = a;
                    domStyle.set("loadingSpectralProfile", 'display', 'block');
                    var layersRequest = esriRequest({
                        url: this.ISLayers[a].url + "/1/info/keyProperties",
                        content: {f: "json"},
                        handleAs: "json",
                        callbackParamName: "callback"
                    });

                    layersRequest.then(lang.hitch(this, function (response) {

                        var bandProp = response.BandProperties;
                        if (bandProp) {
                            for (var i = 0; i < registry.byId("bandCount_" + this.saveValue).get('value'); i++) {
                                if (bandProp[i] && bandProp[i].BandName) {
                                    this.bandNames[i] = bandProp[i].BandName;
                                } else {
                                    var num = i + 1;
                                    this.bandNames[i] = "Band_" + num.toString();
                                }
                                var val;
                                if (registry.byId("bandNames_" + this.saveValue).get('value')) {
                                    val = registry.byId("bandNames_" + this.saveValue).get('value') + "," + this.bandNames[i];
                                } else {
                                    val = this.bandNames[i];
                                }
                                registry.byId("bandNames_" + this.saveValue).set('value', val);
                            }
                        } else {
                            for (var i = 0; i < parseInt(registry.byId("bandCount_" + this.saveValue).get('value')); i++) {
                                var num = i + 1;
                                this.bandNames[i] = "Band_" + num.toString();
                                var val;
                                if (registry.byId("bandNames_" + this.saveValue).get('value')) {
                                    val = registry.byId("bandNames_" + this.saveValue).get('value') + "," + this.bandNames[i];
                                } else {
                                    val = this.bandNames[i];
                                }
                                registry.byId("bandNames_" + this.saveValue).set('value', val);
                            }
                        }
                        domStyle.set("loadingSpectralProfile", 'display', 'none');
                        if (this.saveValue < this.ISLayers.length - 1) {

                            this.loopRequest(this.saveValue + 1);
                        }
                    }), lang.hitch(this, function () {
                        for (var i = 0; i < parseInt(registry.byId("bandCount_" + this.saveValue).get('value')); i++) {
                            var num = i + 1;
                            this.bandNames[i] = "Band_" + num.toString();
                            var val;
                            if (registry.byId("bandNames_" + this.saveValue).get('value')) {
                                val = registry.byId("bandNames_" + this.saveValue).get('value') + "," + this.bandNames[i];
                            } else {
                                val = this.bandNames[i];
                            }
                            registry.byId("bandNames_" + this.saveValue).set('value', val);
                        }
                        domStyle.set("loadingSpectralProfile", 'display', 'none');
                        if (this.saveValue < this.ISLayers.length - 1) {

                            this.loopRequest(this.saveValue + 1);
                        }
                    }));

                },
                setValues: function () {

                    for (var a = 0; a < this.ISLayers.length; a++) {
                        if (this.ISLayers[a] && this.ISLayers[a].bandCount) {
                            domStyle.set(dom.byId("count_" + a), 'display', 'none');
                            domStyle.set(dom.byId("names_" + a), 'display', 'table-row');
                            registry.byId("bandCount_" + a).set('value', this.ISLayers[a].bandCount);
                            if (this.ISLayers[a].bandCount < 3) {
                                registry.byId("ndvi_" + a).set('disabled', true);
                            }
                        }
                        this._populateDropDown(registry.byId("category_" + a), this.ISLayers[a].fields, "esriFieldTypeInteger", new RegExp(/Category/i));
                        this._populateDropDown(registry.byId("acquisitionDate_" + a), this.ISLayers[a].fields, "esriFieldTypeDate", new RegExp(/acq[a-z]*[_]?Date/i));
                        if (registry.byId("category_" + a).getOptions().length === 1) {
                            registry.byId("ndvi_" + a).set('disabled', true);
                            registry.byId("overlap_" + a).set('disabled', true);
                        } else if (registry.byId("acquisitionDate_" + a).getOptions().length === 1) {
                            registry.byId("ndvi_" + a).set('disabled', true);
                            registry.byId("overlap_" + a).set('disabled', true);
                        }
                    }

                    if (this.ISLayers.length)
                        this.loopRequest(0);
                },
                _populateDropDown: function (node, fields, dataType, regExpr) {
                    var options = [{"label": "Select a field", "value": ""}];
                    var j = 1;
                    var initialVal = "";
                    if (fields) {
                        for (var i in fields) {
                          //  if (fields[i].type === dataType) {
                                options[j] = {"label": fields[i].name, "value": fields[i].name};
                                var str = fields[i].name;
                                if (initialVal === "" && regExpr.test(str)) {
                                    initialVal = str;
                                }
                                j++;
                            }
                       // }
                    }
                    node.addOption(options);
                    node.set('value', initialVal);
                }

            });
        });