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
        "dojo/text!./Setting.html",
        "dojo/_base/lang",
        'jimu/BaseWidgetSetting',
        "esri/request",
        "dojo/dom-construct",
        "dojo/_base/array",
        "./ServiceField",
        "dojo/dom-class",
        "dijit/form/Select",
        "./AddedService",
        "./GeneralConfiguration",
        "dojo/Deferred"
    ],
    function (declare, template, lang, BaseWidgetSetting, esriRequest, domConstruct, array, ServiceField, domClass, Select, AddedService, GeneralConfiguration, Deferred) {
        return declare(
            [BaseWidgetSetting],
            {
                addedServicesByUrl: {},
                ignoreFields: ["Shape", "Shape_Length", "Shape_Area"],

                templateString: template,
                startup: function () {
                    this.inherited(arguments);

                    this.cloudCoverSortOptions = [
                        {
                            "label": this.nls.leastCloudCover,
                            "value": {
                                "sortField": "__commonCloudCover",
                                "descending": false

                            }
                        },
                        {
                            "label": this.nls.mostCloudCover,
                            "value": {
                                "sortField": "__commonCloudCover",
                                "descending": true

                            }
                        }

                    ];
                    this.acquisitionDateSortOptions = [
                        {
                            "label": this.nls.newest,
                            "value": {
                                "sortField": "__mostRecentDelta",
                                "descending": false
                            }
                        },
                        {
                            "label": this.nls.oldest,
                            "value": {
                                "sortField": "__mostRecentDelta",
                                "descending": true
                            }
                        }

                    ];

                    this.serviceLabel = [
                        {
                            "label": this.nls.sensorAZ,
                            "value": {
                                "sortField": "__serviceLabel",
                                "descending": false
                            }
                        },
                        {
                            "label": this.nls.sensorZA,
                            "value": {
                                "sortField": "__serviceLabel",
                                "descending": true
                            }
                        }
                    ];

                    if (!this.config) {
                        this.config = {
                            useUTCDate: false,
                            dateFormat: "dd MMM yyyy",
                            shoppingCartButtonLabel: this.nls.goToCart,
                            "discoveryTools": {
                                "currentExtent": true,
                                "point": true,
                                "rectangle": true,
                                "coordinates": true
                            },
                            "csvExportEnabled": true,
                            "showLayerManipulation": true,
                            "thumbnailLoadErrorImage": "widgets/ISCatalog/base/Results/images/archive_thumb.png",
                            "minDateRangeFilterDelta": 86400000,
                            "defaultCloudCover": 100,
                            "sortOptions": [],
                            "webmap": {
                                "basemapUrl": "http://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer",
                                "disabled": false
                            },
                            "utmSearchConfiguration": {
                                "utmLookupJsonUrl": "widgets/ISCatalog/base/SearchByBoundsWidget/config/UTMWKIDLookup.json"
                            },
                            searchServices: []
                        }
                    }
                    this.setConfig(this.config);
                },
                getConfig: function () {
                    this.config.searchServices = [];
                    for (var key in this.addedServicesByUrl) {
                        if (this.addedServicesByUrl.hasOwnProperty(key)) {
                            this.config.searchServices.push(this.addedServicesByUrl[key].getConfig());
                        }
                    }
                    var sortFields = [];
                    if (this.showAcquisitionDateSorts.checked) {
                        sortFields = this.acquisitionDateSortOptions;
                    }
                    if (this.showCloudCoverSorts.checked) {
                        sortFields = sortFields.concat(this.cloudCoverSortOptions);
                    }
                    sortFields = sortFields.concat(this.serviceLabel);
                    this.config.csvExportEnabled = this.enableCSVCheckout.checked;
                    this.config.webmap.disabled = !this.enableWebmapCheckout.checked;
                    this.config.sortOptions = sortFields;
                    return this.config;
                },
                setConfig: function (config) {
                    this.config = config;
                    var currentSearchService, newServiceWidget;
                    var i;
                    //check to see if there are sorts
                    var serviceLoadOptions = {
                        showCloudCoverSort: false,
                        showAcquisitionDateSort: false

                    };
                    if (this.config.sortOptions) {
                        for (i = 0; i < this.config.sortOptions.length; i++) {
                            if (this.config.sortOptions[i] && this.config.sortOptions[i].value) {
                                if (this.config.sortOptions[i].value.sortField === "__mostRecentDelta") {
                                    serviceLoadOptions.showAcquisitionDateSort = true;
                                }
                                if (this.config.sortOptions[i].value.sortField === "__commonCloudCover") {
                                    serviceLoadOptions.showCloudCoverSort = true;

                                }

                            }
                        }
                    }
                    this.enableCSVCheckout.checked = this.config.csvExportEnabled != false;

                    if (this.config.webmap === null || !this.config.webmap.disabled) {
                        this.enableWebmapCheckout.checked = true;
                    }
                    if (serviceLoadOptions.showAcquisitionDateSort) {
                        this.showAcquisitionDateSorts.checked = true;

                    }
                    if (serviceLoadOptions.showCloudCoverSort) {
                        this.showCloudCoverSorts.checked = true;

                    }
                    if (this.config.searchServices) {
                        for (i = 0; i < this.config.searchServices.length; i++) {
                            currentSearchService = this.config.searchServices[i];
                            this._loadServiceFromConfig(currentSearchService, serviceLoadOptions);
                        }
                    }
                },
                postCreate: function () {
                    this.inherited(arguments);
                    this.generalConfiguration = new GeneralConfiguration();
                    this.addedServicesByUrl = {};
                    domConstruct.empty(this.currentServiceContainer);
                    domConstruct.place(this.generalConfiguration.domNode, this.generalConfigurationContainer);
                },
                _loadServiceFromConfig: function (serviceConfig, options) {
                    if (!serviceConfig || !serviceConfig.url) {
                        return;
                    }
                    var serviceUrl = serviceConfig.url;
                    if (this.addedServicesByUrl[serviceUrl.toLowerCase()]) {
                        alert(this.nls.serviceAlreadyAdded);
                        return;
                    }
                    this._loadServiceDescription(serviceConfig.url).then(lang.hitch(this, function (serviceDesc) {
                        if (!serviceDesc || !serviceDesc.fields) {
                            this.hideServicesContainer();
                            return;
                        }
                        this.showServicesContainer();
                        var currentService = new AddedService({
                            nls: this.nls,
                            serviceDescription: serviceDesc,
                            serviceUrl: serviceUrl
                        });
                        currentService.setConfig(serviceConfig);
                        currentService.on("deleteService", lang.hitch(this, this.deleteService));
                        this.addedServicesByUrl[serviceUrl.toLowerCase()] = currentService;
                        domConstruct.place(currentService.domNode, this.currentServiceContainer);
                        if (options) {
                            if (!options.showAcquisitionDateSort) {
                                currentService.hideAcquisitionDateSort();
                            }
                            if (!options.showCloudCoverSort) {
                                currentService.hideCloudCoverSort();
                            }

                        }
                    }));
                },
                loadServiceFromUser: function () {
                    if (!this.serviceUrl.value) {
                        return;
                    }
                    if (this.addedServicesByUrl[this.serviceUrl.value.toLowerCase()]) {
                        alert(this.nls.serviceAlreadyAdded);
                        return;
                    }
                    var url = this.serviceUrl.value;
                    this._loadServiceDescription(url).then(lang.hitch(this, function (serviceDesc) {
                        if (!serviceDesc || !serviceDesc.fields) {
                            this.hideServicesContainer();
                            return;
                        }
                        this.showServicesContainer();
                        this.collapseAllAddedServices();
                        var currentService = new AddedService({
                            nls: this.nls,
                            serviceDescription: serviceDesc,
                            serviceUrl: url
                        });

                        if (this.showAcquisitionDateSorts.checked) {
                            currentService.showAcquisitionDateSort();
                        }
                        else {
                            currentService.hideAcquisitionDateSort();

                        }
                        if (this.showCloudCoverSorts.checked) {
                            currentService.showCloudCoverSort();
                        }
                        else {
                            currentService.hideCloudCoverSort();

                        }


                        currentService.on("deleteService", lang.hitch(this, this.deleteService));
                        this.addedServicesByUrl[url.toLowerCase()] = currentService;
                        domConstruct.place(currentService.domNode, this.currentServiceContainer)

                    }));
                },
                showServicesContainer: function () {
                    if (domClass.contains(this.currentServiceContainer, "hidden")) {
                        domClass.remove(this.currentServiceContainer, "hidden");
                    }
                },
                hideServicesContainer: function () {
                    if (!domClass.contains(this.currentServiceContainer, "hidden")) {
                        domClass.add(this.currentServiceContainer, "hidden");
                    }
                },
                _loadServiceDescription: function (url) {
                    var def = new Deferred();
                    var jsonpArgs = {
                        content: {f: "json"},
                        url: url,
                        handleAs: "json"
                    };
                    esriRequest(jsonpArgs).then(lang.hitch(this, function (response) {
                        def.resolve(response);
                    }), function (err) {
                        def.resolve(null);
                    });
                    return def;
                },
                deleteService: function (addedService) {
                    if (!addedService) {
                        return;
                    }
                    delete this.addedServicesByUrl[addedService.serviceUrl.toLowerCase()];
                    addedService.destroy();
                },
                collapseAllAddedServices: function () {
                    if (this.addedServicesByUrl) {
                        for (var key in this.addedServicesByUrl) {
                            if (this.addedServicesByUrl.hasOwnProperty(key)) {
                                this.addedServicesByUrl[key].collapse();
                            }
                        }
                    }
                },
                handleToggleCloudCoverSort: function () {
                    if (this.showCloudCoverSorts.checked) {
                        this.showCloudCoverSortOnServices();

                    }
                    else {
                        this.hideCloudCoverSortOnServices();

                    }

                },
                handleToggleAcquisitionDateSort: function () {
                    if (this.showAcquisitionDateSorts.checked) {
                        this.showAcquisitionDateSortOnServices();

                    }
                    else {

                        this.hideAcquisitionDateSortOnServices();
                    }

                },
                showCloudCoverSortOnServices: function () {
                    for (var key in   this.addedServicesByUrl) {
                        if (this.addedServicesByUrl.hasOwnProperty(key)) {
                            this.addedServicesByUrl[key].showCloudCoverSort();

                        }
                    }

                },
                hideCloudCoverSortOnServices: function () {
                    for (var key in   this.addedServicesByUrl) {
                        if (this.addedServicesByUrl.hasOwnProperty(key)) {
                            this.addedServicesByUrl[key].hideCloudCoverSort();

                        }
                    }
                },
                showAcquisitionDateSortOnServices: function () {
                    for (var key in   this.addedServicesByUrl) {
                        if (this.addedServicesByUrl.hasOwnProperty(key)) {
                            this.addedServicesByUrl[key].showAcquisitionDateSort();

                        }
                    }

                },
                hideAcquisitionDateSortOnServices: function () {
                    for (var key in   this.addedServicesByUrl) {
                        if (this.addedServicesByUrl.hasOwnProperty(key)) {
                            this.addedServicesByUrl[key].hideAcquisitionDateSort();

                        }
                    }

                }
            });
    })
;
