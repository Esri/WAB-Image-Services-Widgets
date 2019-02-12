//////////////////////////////////////////////////////////////////////////////
// Copyright 2013 Esri
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
//////////////////////////////////////////////////////////////////////////////

define([
        "dojo/_base/declare",
        "dojo/text!./template/RendererWidgetTemplate.html",
        "dojo/_base/lang",
        "dijit/form/Select",
        "dojo/data/ObjectStore",
        "dojo/store/Memory",
        "../BaseAnalysisWidget",
        "esri/layers/RasterFunction"
    ],
    function (declare, template, lang, Select, ObjectStore, Memory, BaseAnalysisWidget, RasterFunction) {

        return declare([BaseAnalysisWidget], {
            NO_RENDERER: "*NONE*",
            templateString: template,
            _createRendererSelect: function (store) {
                if (this.rendererSelect) {               
                    this.rendererSelect.destroy();
                }
                
               // if (!this.rendererSelect) {
                    this.rendererSelect = new Select({
                        store: store,
                        style: {
                            width: "100%"
                        }
                    });
                    this.rendererSelect.placeAt(this.rendererSelectContainer);
                    this.rendererSelect.on("change", lang.hitch(this, this.handleRendererChange));
               // }
                var selectedValue = (this.currentLayer && this.currentLayer.renderingRule && this.currentLayer.renderingRule.functionName) ? this.currentLayer.renderingRule.functionName : this.NO_RENDERER;
                this.rendererSelect.set("value", selectedValue);
            },
            clear: function () {
                this.inherited(arguments);
                //this.rendererSelect = null;
                this.hide();
            },
            reload: function () {
                this.clear();
                if (this.currentLayer && this.currentLayer.rasterFunctionInfos && this.currentLayer.rasterFunctionInfos.length > 0) {
                    this.setupRenderSelect(this.currentLayer.rasterFunctionInfos);
                    this.show();
                }
            },
            setupRenderSelect: function (rasterFunctionInfos) {
                if (!this.currentLayer) {
                    return;
                }
                var i, data = [
                    {id: this.NO_RENDERER, label: "--NONE--"}
                ], store;
                for (i = 0; i < rasterFunctionInfos.length; i++) {
                    if (rasterFunctionInfos[i].name === "None") {
                        continue;
                    }
                    data.push({
                        id: rasterFunctionInfos[i].name, label: rasterFunctionInfos[i].name
                    })
                }
                store = new ObjectStore({objectStore: new Memory({data: data})});

                this._createRendererSelect(store);
            },
            handleRendererChange: function (value) {
                if (this.currentLayer) {
                    if (!value || value === this.NO_RENDERER) {
                        this.currentLayer.setRenderingRule(null);
                    }
                    else {
                        if (this.currentLayer.renderingRule && this.currentLayer.renderingRule.functionName === value) {
                            //this is already the current rendering rule
                            return;
                        }
                        var rasterFunction = new RasterFunction();
                        rasterFunction.functionName = value;
                        this.currentLayer.setRenderingRule(rasterFunction);
                    }
                }
            },
            isSupportedLayer: function () {
                return this.currentLayer && this.currentLayer.rasterFunctionInfos && this.currentLayer.rasterFunctionInfos.length > 0;
            }
        });
    })
;