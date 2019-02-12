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
        "dojo/text!./template/TransparencyWidgetTemplate.html",
        "dojo/_base/lang",
        "dijit/form/HorizontalSlider",
        "../BaseAnalysisWidget"
    ],
    function (declare, template, lang, HorizontalSlider, BaseAnalysisWidget) {

        return declare([BaseAnalysisWidget], {
            templateString: template,
            postCreate: function () {
                this.inherited(arguments);
                this.createTransparencySlider();

            },
            clear: function () {
                this.inherited(arguments);
                if (this.transparencySlider) {
                    this.transparencySlider.set("value", 0);
                }
            },
            reload: function () {
                if (this.currentLayer) {
                    if (this.transparencySlider && this.currentLayer) {
                        var trans = Math.ceil((1 - this.currentLayer.opacity) * 100);
                        this.transparencySlider.set("value", trans);
                    }
                }
            },
            createTransparencySlider: function () {
                if (this.transparencySlider) {
                    return;
                }
                this.transparencySlider = new HorizontalSlider({
                    minimum: 0,
                    maximum: 100,
                    intermediateChanges: true,
                    value: 0,
                    discreteValues: 101,
                    pageIncrement: 1
                }, this.sliderContainer);
                this.transparencySlider.on("change", lang.hitch(this, this.handleTransparencyChange));
            },
            handleTransparencyChange: function (value) {
                if (this.currentLayer) {
                    value *= 0.01;
                    this.currentLayer.setOpacity(1 - value)
                }
            },
            isSupportedLayer: function () {
                return true;
            }

        });
    });