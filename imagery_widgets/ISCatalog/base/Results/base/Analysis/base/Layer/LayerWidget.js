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
        "dojo/text!./template/LayerWidgetTemplate.html",
        "dojo/_base/lang",
        "dijit/form/Select",
        "dojo/dom-construct",
        "../BaseAnalysisWidget"
    ],
    function (declare, template, lang, Select, domConstruct, BaseAnalysisWidget) {

        return declare([BaseAnalysisWidget], {
            templateString: template,
            NO_LAYER: "*NoLayer",
            postCreate: function () {
                this.inherited(arguments);
                this.hide();
            },
            addLayer: function (layer) {
                if (!this.layerSelect) {
                    this.createLayerSelect();
                }
                this.layerSelect.addOption({
                    label: layer.label || layer.name,
                    value: layer.url
                });
                if (!this.isVisible()) {
                    this.show();
                }
            },
            clear: function () {
                this.inherited(arguments);
                this._destroySelect();
                this.hide();
            },
            _destroySelect: function () {
                if (this.layerSelect) {
                    this.layerSelect.destroy();
                    this.layerSelect = null;
                    domConstruct.empty(this.layerSelectContainer);
                }
            },
            createLayerSelect: function () {
                if (this.layerSelect) {
                    return;
                }
                this.layerSelect = new Select(
                    {
                        style: "width: 100%",
                        options: [
                            {
                                label: "--Select--",
                                value: this.NO_LAYER
                            }
                        ]
                    });
                this.layerSelect.placeAt(this.layerSelectContainer);
                this.layerSelect.on("change", lang.hitch(this, this._onLayerSelected))
            },
            _onLayerSelected: function (layerUrl) {
                this.onLayerSelected(layerUrl === this.NO_LAYER ? null : layerUrl);
            },
            onLayerSelected: function (layerUrl) {

            },
            resetLayerSelection: function(){
              if(this.layerSelect){
                  this.layerSelect.set("value",this.NO_LAYER);
              }
            }

        });
    });