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
    'dojo/_base/declare',
    "dojo/text!./template/IconSearchFilterTemplate.html",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/_base/lang",
    "dojo/dom-construct",
    "dijit/form/TextBox",
    "dijit/form/NumberTextBox",
    "dijit/form/Select"
],
    function (declare, template, _WidgetBase, _TemplatedMixin, lang, domConstruct, TextBox, NumberTextBox, Select) {
        return declare([_WidgetBase, _TemplatedMixin], {
            templateString: template,
            defaultPixelSize: 10,
            _fieldNameTemplateEntry: "${fieldName}",
            _valueTemplateEntry: "${value}",
            _nullValue: "_null_",
            constructor: function (params) {
                lang.mixin(this, params || {});
            },
            postCreate: function () {
                this.inherited(arguments);
                this.createPixelSizeInput();
                this.createImageTypeSelect();
            },
            createPixelSizeInput: function () {
                this.minPixelSizeInput = new NumberTextBox({
                    style: {width: "30%", float: "left", margin: "0 10%"},
                    placeholder: this.nls.min
                });
                this.maxPixelSizeInput = new NumberTextBox({
                    style: {width: "30%", float: "left"},
                    placeholder: this.nls.max
                });
                domConstruct.place(this.minPixelSizeInput.domNode, this.pixelSizeContainer);
                domConstruct.place(this.maxPixelSizeInput.domNode, this.pixelSizeContainer);
            },
            createImageTypeSelect: function () {
                this.imageTypeSelect = new Select({
                    style: {width: "100%", marginTop: "5px"},

                    options: [
                        { label: "NaturalColor", value: "NaturalColor"},
                        { label: "Pan", value: "Pan"},
                        { label: "Multispectral", value: "Multispectral"},
                        { label: "NIR", value: "NIR"},
                        { label: "SWIR", value: "SWIR"},
                        { label: "Thermal", value: "Thermal"},
                        { label: "Superspectral", value: "Superspectral"},
                        { label: "Hyperspectral", value: "Hyperspectral"},
                        { label: "Radar", value: "Radar"},
                        { label: "Elevation", value: "Elevation"}
                    ]
                });
                domConstruct.place(this.imageTypeSelect.domNode, this.imageTypeSelectContainer);
            },
            getSearchParameters: function () {
                var params = {
                    imagemode: this.imageTypeSelect.get("value"),
                    queryParts: []

                };
                var minPixel = this.minPixelSizeInput.get("value");
                var maxPixel = this.maxPixelSizeInput.get("value");
                if (minPixel || minPixel === 0) {
                    params.queryParts.push("Mingsd=" + minPixel);
                }
                if (maxPixel || maxPixel === 0) {
                    params.queryParts.push("Maxgsd=" + maxPixel);
                }
                return params;
            }

        });
    });


