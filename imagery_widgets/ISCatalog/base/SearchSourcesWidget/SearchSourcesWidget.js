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
        "dojo/text!./template/SearchSourcesWidgetTemplate.html",
        "dijit/_WidgetBase",
        "dijit/_TemplatedMixin",
        "dojo/dom-construct",
        "dojo/dom-class",
        "dojo/on",
        "dojo/_base/lang",
        "dijit/form/CheckBox"
    ],
    function (declare, template, _WidgetBase, _TemplatedMixin, domConstruct, domClass, on, lang, CheckBox) {
        return declare([_WidgetBase, _TemplatedMixin], {
            templateString: template,
            searchServices: null,
            postCreate: function () {
                this.inherited(arguments);
                this.activeSourcesLookup = {};
                if (this.searchServices) {
                    var i;
                    for (i = 0; i < this.searchServices.length; i++) {
                        this._addSearchService(this.searchServices[i]);
                    }
                }
            },
            /**
             * adds query layer controller entry to the active sources widget
             * @param searchService
             */
            _addSearchService: function (searchService) {
                if (searchService && searchService.label) {
                    var container, lblNode, iconClass, checkbox;
                    container = domConstruct.create("div", {className: "imagerySearchSourcesListEntry"});
                    lblNode = domConstruct.create("span", {className: "imagerySearchSourceLabel", innerHTML: searchService.label});
                    checkbox = new CheckBox();
                    if (searchService.enabledOnLoad) {
                        checkbox.set("value", true);
                    }
                    else {
                    }
                    domConstruct.place(checkbox.domNode, container);
                    domConstruct.place(lblNode, container);
                    domConstruct.place(container, this.sourcesListContainer);
                    on(checkbox, "change", lang.hitch(this, this.handleContainerToggle, {sourceValue: searchService.label, checkbox: checkbox, searchService: searchService}))
                }
            },
            /**
             * toggles the active sources container
             * @param params
             * @param checked
             */
            handleContainerToggle: function (params, checked) {
                if (params && checked && params.searchService) {
                    this.activeSourcesLookup[params.sourceValue] = params.searchService;
                }
                else {
                    delete this.activeSourcesLookup[params.sourceValue];

                }
            },
            getActiveSources: function () {
                var key, activeSources = [];
                for (key in this.activeSourcesLookup) {
                    if (this.activeSourcesLookup.hasOwnProperty(key)) {
                        activeSources.push(this.activeSourcesLookup[key]);
                    }
                }
                return activeSources;
            }
        });
    });