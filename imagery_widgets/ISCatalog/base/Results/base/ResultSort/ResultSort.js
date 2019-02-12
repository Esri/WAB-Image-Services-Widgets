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
        "dojo/text!./template/ResultSortTemplate.html",
        "dijit/_WidgetBase",
        "dijit/_TemplatedMixin",
        "dijit/_WidgetsInTemplateMixin",
        "dojo/_base/lang",
        "dojo/dom-class",
        "../../../BaseDiscoveryMixin",
        "dijit/form/Select"
    ],
    function (declare, template, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, lang, domClass, BaseDiscoveryMixin, Select) {

        return declare([_WidgetBase, _TemplatedMixin, BaseDiscoveryMixin, _WidgetsInTemplateMixin], {
            widgetsInTemplate: true,
            templateString: template,
            sortOptions: [],
            constructor: function (params) {
                lang.mixin(this, params || {});
            },
            createSorter: function () {
                if (this.archiveSortSelect) {
                    this.archiveSortSelect.destroy();
                }
                this._sortValuesById = {};
                this.archiveSortSelect = new Select();
                this.archiveSortSelect.on("change", lang.hitch(this, this._handleSortChange));
                var i, selectId;
                for (i = 0; i < this.sortOptions.length; i++) {
                    selectId = "select_" + i;
                    this.archiveSortSelect.addOption({label: this.sortOptions[i].label, value: selectId});
                    this._sortValuesById[selectId] = this.sortOptions[i].value;
                    if (i === 0) {
                        this.archiveSortSelect.set("value", selectId);
                    }
                }
                this.archiveSortSelect.placeAt(this.sortSelectContainer);
            },
            _handleSortChange: function (value) {
                this.onSortChange(this._sortValuesById[value]);
            },
            onSortChange: function (value) {

            },
            isVisible: function () {
                return   !domClass.contains(this.domNode, "hidden");
            },

            clear: function () {
                if (this.archiveSortSelect) {
                    this.archiveSortSelect.destroy();
                }
                this.hide();
            },
            toggle: function () {
                if (domClass.contains(this.domNode, "hidden")) {
                    this.show();
                }
                else {
                    this.hide();
                }
            },
            show: function () {
                if (domClass.contains(this.domNode, "hidden")) {
                    domClass.remove(this.domNode, "hidden");
                }

            },
            hide: function () {
                if (!domClass.contains(this.domNode, "hidden")) {
                    domClass.add(this.domNode, "hidden");
                }
            }


        });
    })
;
