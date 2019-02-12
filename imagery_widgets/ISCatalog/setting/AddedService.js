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
        "dojo/text!./AddedService.html",
        "dojo/_base/lang",
        "dijit/_WidgetBase",
        "dijit/_TemplatedMixin",
        "esri/request",
        "dojo/dom-construct",
        "dojo/_base/array",
        "./ServiceField",
        "dojo/dom-class",
        "dojo/dom-attr",
        "dijit/form/Select",
        "dojox/uuid/Uuid",
        "dojox/uuid/generateTimeBasedUuid"
    ],
    function (declare, template, lang, _WidgetBase, _TemplatedMixin, esriRequest, domConstruct, array, ServiceField, domClass, domAttr, Select, Uuid, generateTimeBasedUuid) {
        return declare(
            [_WidgetBase, _TemplatedMixin],
            {
                ignoreFields: ["Shape", "Shape_Length", "Shape_Area"],
                templateString: template,
                downloadableService: false,
                constructor: function (params) {
                    Uuid.setGenerator(generateTimeBasedUuid);
                    lang.mixin(this, params || {});
                    this.config = {
                        url: "",
                        queryWhereClauseAppend: "Category = 1",
                        label: "",
                        commonFields: {},
                        enabledOnLoad: true,
                        detailsFields: [
                            {
                                "label": this.nls.source,
                                "name": "__serviceLabel"
                            }
                        ],
                        displayFields: []
                    };

                    this.serviceUrl = "";
                    this.serviceDescription = null;
                    this.serviceFieldsByName = {};
                    this.serviceFields = [];
                },
                postCreate: function () {
                    this.inherited(arguments);
                    if (!this.serviceDescription) {
                        return;
                    }
                    domAttr.set(this.urlLabel, "innerHTML", this.serviceUrl);
                    this.serviceDisplayNameInput.value = this.serviceDescription.name;
                    this.setDisplayFields(this.serviceDescription.fields);
                    this.setSortSelects(this.serviceDescription.fields);

                    //check if service allows download
                    if (this.serviceDescription && this.serviceDescription.capabilities && this.serviceDescription.capabilities.indexOf("Download") > -1) {
                        domClass.remove(this.downloadEnabledContainer, "hidden");
                        this.downloadableService = true;
                    }
                },
                removeService: function () {
                    this._onDeleteService();
                },
                _onDeleteService: function () {
                    this.onDeleteService(this);
                },
                onDeleteService: function (self) {

                },
                setSortSelects: function (fields) {
                    if (this.cloudCoverSelect) {
                        this.cloudCoverSelect.destroy();
                    }
                    if (this.acqDateSelect) {
                        this.acqDateSelect.destroy();
                    }

                    var i, cloudCoverSelectOptions = [], acqDateSelectOptions = [], currentField, currentFieldNameLower, newAcqOption, newCloudOption, foundAcq = false, foundCloud = false, defaultCloudCoverValue = " ", defaultAcqDateValue = " ";
                    var acqNoFieldOption = {label: "*" + this.nls.NO_FIELD + "*", value: " "};
                    var cloudCoverNoFieldOption = {label: "*" + this.nls.NO_FIELD + "*", value: " "};
                    cloudCoverSelectOptions.push(cloudCoverNoFieldOption);
                    acqDateSelectOptions.push(acqNoFieldOption);
                    for (i = 0; i < fields.length; i++) {
                        currentField = fields[i];
                        if (array.indexOf(this.ignoreFields, currentField.name) > -1) {
                            continue;
                        }
                        newAcqOption = {label: currentField.name, value: currentField.name};
                        newCloudOption = {label: currentField.name, value: currentField.name};
                        cloudCoverSelectOptions.push(newCloudOption);
                        acqDateSelectOptions.push(newAcqOption);
                        currentFieldNameLower = currentField.name.toLowerCase();
                        if (currentField.type === "esriFieldTypeDate" && currentFieldNameLower.indexOf("acquisition") && !foundAcq) {
                            foundAcq = true;
                            defaultAcqDateValue = currentField.name;
                        }
                        if (currentFieldNameLower.indexOf("cloud") > -1 && !foundCloud) {
                            foundCloud = true;
                            defaultCloudCoverValue = currentField.name;

                        }

                    }
                    this.cloudCoverSelect = new Select({
                        options: cloudCoverSelectOptions,
                        value: defaultCloudCoverValue,
                        style: {minWidth: "12em"}
                    });

                    this.acqDateSelect = new Select({
                        options: acqDateSelectOptions,
                        value: defaultAcqDateValue,
                        style: {minWidth: "12em"}
                    });
                    domConstruct.empty(this.cloudCoverSelectContainer);
                    domConstruct.empty(this.acqDateSelectContainer);
                    domConstruct.place(this.cloudCoverSelect.domNode, this.cloudCoverSelectContainer);
                    domConstruct.place(this.acqDateSelect.domNode, this.acqDateSelectContainer);
                },
                setDisplayFields: function (fields) {
                    domConstruct.empty(this.serviceDisplayFields);
                    if (!fields) {
                        return;
                    }
                    var i, serviceField, currField;
                    for (i = 0; i < fields.length; i++) {
                        currField = fields[i];
                        if (array.indexOf(this.ignoreFields, currField.name) > -1) {
                            continue;
                        }
                        serviceField = new ServiceField({
                            field: currField,
                            nls: this.nls,
                            serviceId: "id_" +this.generateUUID()
                        });
                        this.serviceFields.push(serviceField);
                        this.serviceFieldsByName[currField.name] = serviceField;
                        domConstruct.place(serviceField.domNode, this.serviceDisplayFields);
                    }
                },
                toggleServiceCollapse: function () {
                    if (!domClass.contains(this.addedDiscoveryServiceHeader, "collapsedHeader")) {
                        this.collapse();
                    }
                    else {
                        this.expand();
                    }
                },
                collapse: function () {
                    domAttr.set(this.addedDiscoveryServiceHeader, "title", "Expand");
                    this.hideNode(this.addedDiscoveryServicePanel);
                    domClass.add(this.addedDiscoveryServiceHeader, "collapsedHeader");
                },
                expand: function () {
                    domClass.remove(this.addedDiscoveryServiceHeader, "collapsedHeader");
                    domAttr.set(this.addedDiscoveryServiceHeader, "title", "Collapse");
                    this.showNode(this.addedDiscoveryServicePanel);
                },
                hideNode: function (node) {
                    if (!domClass.contains(node, "hidden")) {
                        domClass.add(node, "hidden");
                    }
                },
                showNode: function (node) {
                    if (domClass.contains(node, "hidden")) {
                        domClass.remove(node, "hidden");
                    }
                },
                destroy: function () {
                    this.inherited(arguments);
                    if (this.domNode && this.domNode.parentNode) {
                        domConstruct.destroy(this.domNode);
                    }

                },
                getConfig: function () {
                    var currentDisplayField, currentFieldConfig;
                    this.config.detailsFields = [];
                    this.config.detailsFields = [
                        {
                            "label": this.nls.source,
                            "name": "__serviceLabel"
                        }
                    ];

                    this.config.url = this.serviceUrl;
                    this.config.label = (this.serviceDisplayNameInput.value ? this.serviceDisplayNameInput.value : this.serviceDescription.name);
                    for (var i = 0; i < this.serviceFields.length; i++) {
                        currentDisplayField = this.serviceFields[i];
                        if (currentDisplayField.enabled) {
                            currentFieldConfig = JSON.parse(JSON.stringify(currentDisplayField.getConfig()));
                            currentDisplayField.isDisplayFieldInPopup() ? this.config.detailsFields.push(currentFieldConfig) : this.config.displayFields.push(currentFieldConfig);
                        }
                    }

                    if (!domClass.contains(this.cloudCoverSortContainer, "hidden")) {
                        var cloudCoverField = this.cloudCoverSelect.get("value");

                        if (cloudCoverField && cloudCoverField != " ") {
                            this.config.commonFields.cloudCover = cloudCoverField;
                        }
                    }
                    if (!domClass.contains(this.acquisitionDateSortContainer, "hidden")) {
                        var acqDateField = this.acqDateSelect.get("value");
                        if (acqDateField && acqDateField != " ") {
                            this.config.commonFields.acquisitionDate = acqDateField;
                        }
                    }
                    if (this.downloadableService) {
                        this.config.downloadEnabled = this.downloadEnabledCheckbox.checked;
                    }
                    return this.config;
                },
                setConfig: function (config) {
                    if (config) {
                        this.serviceDisplayNameInput.value = config.label;
                        this.serviceUrl = config.url;
                    }
                    var i, currentField, currentFieldWidget;
                    if (config.displayFields) {
                        for (i = 0; i < config.displayFields.length; i++) {
                            currentField = config.displayFields[i];
                            currentFieldWidget = this.serviceFieldsByName[currentField.name];
                            if (currentFieldWidget) {
                                currentFieldWidget.setConfig(currentField, "display");
                                currentFieldWidget.enable();
                            }
                        }
                    }
                    if (config.detailsFields) {
                        for (i = 0; i < config.detailsFields.length; i++) {
                            currentField = config.detailsFields[i];
                            currentFieldWidget = this.serviceFieldsByName[currentField.name];
                            if (currentFieldWidget) {
                                currentFieldWidget.setConfig(currentField, "details");
                                currentFieldWidget.enable();
                            }
                        }
                    }
                    this.downloadEnabledCheckbox.checked = config.downloadEnabled === true;
                    if (config.commonFields) {
                        if (config.commonFields.cloudCover) {
                            this.cloudCoverSelect.set("value", config.commonFields.cloudCover);
                        }
                        if (config.commonFields.acquisitionDate) {
                            this.acqDateSelect.set("value", config.commonFields.acquisitionDate);
                        }
                    }
                    domAttr.set(this.urlLabel, "innerHTML", config.url);
                },
                showCloudCoverSort: function () {
                    if (domClass.contains(this.cloudCoverSortContainer, "hidden")) {
                        domClass.remove(this.cloudCoverSortContainer, "hidden");
                        this.showSortingContainer();

                    }

                },
                hideCloudCoverSort: function () {
                    if (!domClass.contains(this.cloudCoverSortContainer, "hidden")) {
                        domClass.add(this.cloudCoverSortContainer, "hidden");
                        if (domClass.contains(this.acquisitionDateSortContainer, "hidden")) {
                            this.hideSortingContainer();
                        }

                    }

                },
                showAcquisitionDateSort: function () {
                    if (domClass.contains(this.acquisitionDateSortContainer, "hidden")) {
                        domClass.remove(this.acquisitionDateSortContainer, "hidden");
                        this.showSortingContainer();
                    }
                },
                hideAcquisitionDateSort: function () {
                    if (!domClass.contains(this.acquisitionDateSortContainer, "hidden")) {
                        domClass.add(this.acquisitionDateSortContainer, "hidden");
                        if (domClass.contains(this.cloudCoverSortContainer, "hidden")) {
                            this.hideSortingContainer();
                        }
                    }
                },
                showSortingContainer: function () {
                    if (domClass.contains(this.sortFieldsContainer, "hidden")) {
                        domClass.remove(this.sortFieldsContainer, "hidden")
                    }

                },
                hideSortingContainer: function () {
                    if (!domClass.contains(this.sortFieldsContainer, "hidden")) {
                        domClass.add(this.sortFieldsContainer, "hidden")

                    }

                },
                generateUUID: function () {
                    var uuid = new Uuid();
                    return uuid.toString();
                }

            });

    });
