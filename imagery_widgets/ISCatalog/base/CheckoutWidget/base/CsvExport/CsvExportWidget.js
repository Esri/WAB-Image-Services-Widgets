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
        "dojo/topic",
        "dojo/text!./template/CsvExportTemplate.html",
        "dijit/_WidgetBase",
        "dijit/_TemplatedMixin",
        'dijit/_WidgetsInTemplateMixin',
        "dijit/form/Button",
        "dojo/dom-class",
        "../../../BaseDiscoveryMixin",
        "dojo/_base/lang",
        "dojo/_base/array",
        "dojo/on",
        "dojo/dom-construct"

    ],
    function (declare, topic, template, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Button, domClass, BaseDiscoveryMixin, lang, array, on, domConstruct, _file_saver, _papa_parse) {
        return declare(
            [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, BaseDiscoveryMixin],
            {
                templateString: template,
                constructor: function (params) {
                    lang.mixin(this, params || {});
                }
                ,
                postCreate: function () {
                    this.inherited(arguments);
                    var isFileSaverSupported = false;
                    try {
                        isFileSaverSupported = !!new Blob;
                    } catch (e) {
                    }
                    if (!isFileSaverSupported) {
                        this.showNoLocalBrowerDownloadMessage();
                    }
                    else {
                        this.hideNoLocalBrowerDownloadMessage();
                    }
                }
                ,
                download: function (serviceName, featuresArray) {
                    var asCSV = Papa.unparse(featuresArray);
                    var blob = new Blob([asCSV], {type: "text/plain;charset=utf-8"});
                    var filename = serviceName.replace(/\W+/g, '_') + ".csv";
                    saveAs(blob, filename);

                },
                generateExportLinks: function () {
                    var currentProcessItem;
                    domConstruct.empty(this.exportCSVLinksList);
                    var processedItems = this.processCartItems();
                    for (var i = 0; i < processedItems.length; i++) {
                        currentProcessItem = processedItems[i];
                        if (currentProcessItem && currentProcessItem.service && currentProcessItem.features) {
                            var li = domConstruct.create("li", {
                                innerHTML: currentProcessItem.service.label,
                                className: "exportCSVLinksListItem"
                            });
                            on(li, "click", lang.hitch(this, this.download, currentProcessItem.service.label, processedItems[i].features));
                            domConstruct.place(li, this.exportCSVLinksList);
                        }
                    }
                },
                processCartItems: function () {
                    var i, cartItems, detailFields, allOutFields, displayFields, currentItem, currentArchiveItem, currentItemService, currentServiceUrl, currentItemByServiceUrlEntry, itemsByServiceUrl = [], currentServiceItems, processedFeature;
                    topic.publish("discovery:getCartItems", function (cartI) {
                        cartItems = cartI;
                    });
                    var csvOutputs = [];
                    if (cartItems && cartItems.archive) {
                        for (i = 0; i < cartItems.archive.length; i++) {
                            currentArchiveItem = cartItems.archive[i];
                            currentItemService = currentArchiveItem[this.COMMON_FIELDS.SERVICE_FIELD];
                            if (!itemsByServiceUrl[currentItemService.url]) {
                                itemsByServiceUrl[currentItemService.url] = {service: currentItemService, items: []};
                            }
                            currentItemByServiceUrlEntry = itemsByServiceUrl[currentItemService.url];
                            currentItemByServiceUrlEntry.items.push(currentArchiveItem);
                        }
                        for (currentServiceUrl in itemsByServiceUrl) {
                            if (itemsByServiceUrl.hasOwnProperty(currentServiceUrl)) {
                                var processedFeatures = [];
                                currentItemByServiceUrlEntry = itemsByServiceUrl[currentServiceUrl];
                                currentServiceItems = currentItemByServiceUrlEntry.items;
                                currentItemService = currentItemByServiceUrlEntry.service;
                                detailFields = currentItemService && currentItemService.detailsFields ? currentItemService.detailsFields : [];
                                displayFields = currentItemService && currentItemService.displayFields ? currentItemService.displayFields : [];
                                allOutFields = [].concat(displayFields).concat(detailFields);
                                for (i = 0; i < currentServiceItems.length; i++) {
                                    currentItem = currentServiceItems[i];
                                    processedFeature = this._getFormattedFieldValues(currentItem, allOutFields, currentItemService.__fieldConfiguration);
                                    processedFeature["Image Service"] = currentItemService.label;
                                    processedFeatures.push(processedFeature);
                                }
                            }
                            csvOutputs.push({features: processedFeatures, service: currentItemService});
                        }
                    }
                    return csvOutputs;

                },
                _getFormattedFieldValues: function (feature, fields, fieldConfiguration) {
                    var i, field, formattedFieldValues = {}, value;
                    if (!fields || !fields.length) {
                        return formattedFieldValues;
                    }
                    for (i = 0; i < fields.length; i++) {
                        field = fields[i];
                        if (field.displayValue) {
                            value = field.displayValue;
                        }
                        else {
                            if (feature.attributes[field.name] || feature.attributes[field.name] === 0) {
                                value = feature.attributes[field.name];

                            }
                            else if (feature[field.name] || feature[field.name] === 0) {
                                value = feature[field.name];
                            }
                            if (field.valueReplacementMap && (field.valueReplacementMap[value] || field.valueReplacementMap[value] === 0)) {
                                value = field.valueReplacementMap[value];
                            }
                        }
                        if (value || value === 0) {
                            if (array.indexOf(fieldConfiguration.dateFields, field.name) > -1) {
                                value = this.getDateString(value, this.useUTCDate, this.dateFormat);
                            }
                            else {
                                if ((field.precision || field.precision === 0) && value.toFixed) {
                                    value = value.toFixed(field.precision);
                                }
                                if (field.displayMultiplier) {
                                    value = Math.ceil(value * field.displayMultiplier);
                                }
                            }
                            value = value.toString();
//                        if (field.valuePrepend) {
//                            value = field.valuePrepend + value;
//                        }
//                        if (field.valueAppend) {
//                            value += field.valueAppend;
//                            console.log(value);
//                        }
                        }
                        formattedFieldValues[field.exportLabel || field.label || field.name] = value;
                    }
                    return formattedFieldValues;
                },
                hideNoLocalBrowerDownloadMessage: function () {
                    this._hideNode(this.noLocalDownloadSupportMessage);
                }
                ,
                showNoLocalBrowerDownloadMessage: function () {
                    this._showNode(this.noLocalDownloadSupportMessage);
                }

            });
    })
;
