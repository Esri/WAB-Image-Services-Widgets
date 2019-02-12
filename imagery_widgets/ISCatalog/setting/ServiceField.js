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
        "dojo/text!./ServiceField.html",
        "dijit/_WidgetBase",
        "dijit/_TemplatedMixin",
        "dojo/dom-class",
        "dojo/_base/array",
        "dojo/_base/lang"
    ],
    function (declare, template, _WidgetBase, _TemplatedMixin, domClass, array, lang) {
        return declare(
            [_WidgetBase, _TemplatedMixin],
            {
                serviceId: null,
                field: null,
                templateString: template,
                enabled: false,
                constructor: function (params) {
                    lang.mixin(this, params || {});
                },
                postCreate: function () {
                    this.inherited(arguments);
                    if (this.field) {
                        if (this.field.type != "esriFieldTypeDouble") {
                            domClass.add(this.displayPrecisionContainer, "hidden");
                        }
                    }
                },
                toggleEnableField: function (evt) {
                    if (!this.enabledCheckbox.checked) {
                        this.disable();
                    }
                    else {
                        this.enable();
                    }
                },
                disable: function () {
                    if (!domClass.contains(this.fieldOptionsContainer, "hidden")) {
                        domClass.add(this.fieldOptionsContainer, "hidden");
                    }
                    this.enabled = false;
                    this.enabledCheckbox.checked = false;
                },
                enable: function () {
                    if (domClass.contains(this.fieldOptionsContainer, "hidden")) {
                        domClass.remove(this.fieldOptionsContainer, "hidden");
                    }
                    this.enabled = true;
                    this.enabledCheckbox.checked = true;
                },
                getConfig: function () {
                    var config = {
                        label: "",
                        name: ""
                    };
                    config.label = this.displayLabel.value;
                    config.name = this.field.name;
                    if (this.valueAppend.value) {
                        config.valueAppend = this.valueAppend.value;
                    }
                    if (this.field.type === "esriFieldTypeDouble" && this.displayPrecision.value) {
                        try {
                            config.precision = parseFloat(this.displayPrecision.value);
                        }
                        catch (err) {

                        }
                    }
                    if (this.showBoldCheckbox.checked) {
                        config.cssClasses = ["boldBig"]
                    }
                    return config;
                },
                setConfig: function (config, type) {
                    if (!config) {
                        return;
                    }
                    if (type === "details") {
                        this.displayPopup.checked = true;
                        this.displayMainResult.checked = false;
                    }
                    else {
                        this.displayPopup.checked = false;
                        this.displayMainResult.checked = true;
                    }
                    this.displayLabel.value = config.label;
                    if (config.valueAppend) {
                        this.valueAppend.value = config.valueAppend;
                    }
                    if (config.precision || config.precision === 0) {
                        this.displayPrecision.value = config.precision.toString();
                    }
                    if (config.cssClasses && array.indexOf(config.cssClasses, "boldBig") > -1) {
                        this.showBoldCheckbox.checked = true;
                    }
                },
                isDisplayFieldInPopup: function () {
                    return this.displayPopup.checked;
                }

            });

    });
