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
        "dojo/text!./template/PortalPublisherTemplate.html",
        "dojo/_base/lang",
        "dojo/_base/json",
        "dojo/dom-class",
        "dojo/dom-construct",
        "dojo/topic",
        "dijit/_WidgetBase",
        "dijit/_TemplatedMixin",
        'dijit/_WidgetsInTemplateMixin',
        "./base/PortalWebMapAnnotationSupport",
        "esri/layers/ArcGISImageServiceLayer",
        "esri/layers/MosaicRule" ,
        "../../../BaseDiscoveryMixin",
        "../../../UserAwareMixin",
        'jimu/portalUtils',
        "dijit/form/CheckBox",
        "esri/graphicsUtils" ,
        'esri/config',
        "esri/tasks/ProjectParameters",
        "esri/SpatialReference",
        "dojo/dom-attr"
    ],
    function (declare, template, lang, json, domClass, domConstruct, topic, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, PortalWebMapAnnotationSupport, ArcGISImageServiceLayer, MosaicRule, BaseDiscoveryMixin, UserAwareMixin, portalUtils, CheckBox, graphicsUtils, esriConfig, ProjectParameters, SpatialReference, domAttr) {
        return declare(
            [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, BaseDiscoveryMixin, UserAwareMixin, PortalWebMapAnnotationSupport],
            {
                map: null,
                portalUrl: "http://www.arcgis.com",
                publishMixinParameters: {
                    type: "Web Map",
                    typeKeywords: "Web Map, Explorer Web Map, Map, Online Map, ArcGIS Online",
                    overwrite: false,
                    f: "json",
                    description: "",
                    accessInformation: "",
                    licenseInfo: "",
                    thumbnailURL: ""

                },
                publishTextMixinParameters: {
                    version: "1.8"
                },
                thumbnailMixinParameters: {
                    format: "png",
                    size: "200,133",
                    cm: 0,
                    nbbox: "",
                    bbox: "",
                    sr: ""
                },
                templateString: template,
                constructor: function (params) {
                    lang.mixin(this, params || {});
                },
                postCreate: function () {
                    this.inherited(arguments);

                    //listeners for group checkboxes
                    this.shareWithEveryoneCheckbox.on("click", lang.hitch(this, this.handleShareWithEveryoneClick));
                    this.shareWithGroupsChecked.on("click", lang.hitch(this, this.handleShareWithGroupsClick));
                    //listen for portal sign out
                    topic.subscribe("userSignOut", lang.hitch(this, this.logPortalUserOut));

                    var portal = portalUtils.getPortal(this.portalUrl);
                    if (portal) {
                        this.portal = portal;
                        if (this.portal.credential) {
                            this.logPortalUserIn();

                        }

                    }
                },
                handleGroupCheckboxClick: function (checkbox) {
                    if (checkbox.get("value")) {
                        if (!this.shareWithEveryoneCheckbox.get("value") && !this.shareWithGroupsChecked.get("value")) {
                            this.shareWithGroupsChecked.set("value", true);
                        }
                    }
                },
                handleShareWithEveryoneClick: function () {
                    if (this.shareWithEveryoneCheckbox.get("value")) {
                        this.shareWithGroupsChecked.set("value", false);
                    }
                },
                handleShareWithGroupsClick: function () {
                    if (this.shareWithGroupsChecked.get("value")) {
                        this.shareWithEveryoneCheckbox.set("value", false);
                    }
                    else {
                        this.clearGroupCheckboxes();
                    }
                },
                clearGroupCheckboxes: function () {
                    if (this.groupCheckboxes) {
                        for (var i = 0; i < this.groupCheckboxes.length; i++) {
                            this.groupCheckboxes[i].set("value", false);
                        }
                    }
                },
                publishWebMap: function () {
                    var webMapName = this.webMapNameInput.get("value");
                    var tags = this.webMapTagsInput.get("value");
                    if (!this.portal) {
                        return;
                    }
                    if (!webMapName) {
                        alert("Web Map name is required");
                        return;
                    }
                    if (!tags) {
                        alert("Tags are required");
                        return;
                    }
                    this.showPendingSaveButton();
                    this.portal.queryItems({
                        q: "title:\"" + webMapName + "\" AND owner:" + this.portal.user.username,
                        n: 1

                    }).then(lang.hitch(this, function (res) {
                        this.cancelPendingSaveButton();
                        if (res && res.total > 0) {
                            alert(this.nls.cannotPublishWebMap);

                        }
                        else {
                            var webMapParameters = this.getWebMapParameters();
                            this.sendAddItemRequest(webMapParameters);

                        }

                    }))
                },
                sendAddItemRequest: function (webMapParameters) {
                    this.hideInputsContent();
                    this.showThrobber();
                    var folderId = this.portalUploadFolderSelect.get("value");
                    var cartItems;
                    topic.publish("discovery:getCartItems", function (cartI) {
                        cartItems = cartI;
                    });
                    var extent = graphicsUtils.graphicsExtent(cartItems.archive);
                    if (esriConfig.defaults && esriConfig.defaults.geometryService) {
                        var params = new ProjectParameters();
                        params.geometries = [extent];
                        params.outSR = new SpatialReference({wkid: 4326});
                        esriConfig.defaults.geometryService.project(params).then(lang.hitch(this, function (res) {
                            var projectedExtent = res[0];
                            webMapParameters.extent = projectedExtent.xmin + "," + projectedExtent.ymin + "," + projectedExtent.xmax + "," + projectedExtent.ymax;
                            this.portal.user.addItem(webMapParameters, folderId).then(lang.hitch(this, this._handleAddItemComplete));
                        }));
                    }

                },
                showThrobber: function () {
                    domClass.remove(this.portalPublisherThrobber, "hidden");
                },
                hideThrobber: function () {
                    domClass.add(this.portalPublisherThrobber, "hidden");
                },
                showSuccessContent: function (itemId) {
                    domClass.remove(this.portalUploadSuccessContainer, "hidden");
                    this.hideInputsContent();
                    this.currentCreatedItemUrl = this.joinUrl(this.portalUrl, "home/item.html?id=" + itemId);
                },

                viewWebmap: function () {
                    if (this.currentCreatedItemUrl) {
                        window.open(this.currentCreatedItemUrl, "_blank");
                    }
                },
                showInputsContent: function () {
                    domClass.add(this.portalUploadSuccessContainer, "hidden");
                    domClass.remove(this.portalUploadInputsContainer, "hidden");
                    this.showPublishInputs();
                },
                hideInputsContent: function () {
                    domClass.add(this.portalUploadInputsContainer, "hidden");
                },
                _handleAddItemComplete: function (response) {
                    this.hideThrobber();
                    //this.viewModel.showPublishInputs();
                    if (response.success) {

                        this.portal.user.shareItem({
                            everyone: true,
                            org: true,
                            groups: true

                        }, response.id, response.folder).then(lang.hitch(this, function () {
                            this.showSuccessContent(response.id);


                        }));
                    }
                    else {
                        alert(this.nls.errorPublishingWebmap);
                    }
                },
                setUsersFolders: function (folders) {
                    var currentFolder;
                    for (var i = 0; i < folders.length; i++) {
                        currentFolder = folders[i];
                        this.portalUploadFolderSelect.addOption({label: currentFolder.title, value: currentFolder.id});
                    }
                },
                getWebMapParameters: function () {
                    var thumbnailParams = lang.mixin({ services: [] }, this.thumbnailMixinParameters);
                    var webMapParams = lang.mixin({}, this.publishMixinParameters);
                    var webMapTextObject = lang.mixin({
                            operationalLayers: [],
                            baseMap: {
                                baseMapLayers: [
                                    {
                                        url: this.webmapConfiguration.basemapUrl,
                                        visibility: true,
                                        opacity: 1
                                    }
                                ],
                                title: "Basemap"
                            }
                        },
                        this.publishTextMixinParameters);
                    var webMapName = this.webMapNameInput.get("value");
                    webMapParams.item = webMapName.toLowerCase() + "_" + new Date().getTime();
                    var tags = this.webMapTagsInput.get("value");
                    if (tags != null) {
                        webMapParams.tags = tags;
                    }
                    else {
                        webMapParams.tags = "";
                    }
                    var description = this.webMapDescription.get("value");
                    if (description != null) {
                        webMapParams.snippet = description;
                    }
                    else {
                        webMapParams.snippet = "";
                    }
                    var operationalLayers = this.createCartLayers();
                    var baseMapLayers = [];
                    var i;
                    var currLayer;
                    var name;
                    var baseMapsTitle;
                    //add all layers to webmap
                    if (lang.isArray(operationalLayers)) {
                        for (i = 0; i < operationalLayers.length; i++) {
                            currLayer = operationalLayers[i];
                            if (currLayer == null || currLayer.url == null) continue;
                            var layerAsWebMapJson = this.layerToWebMapJson(currLayer);
                            if (layerAsWebMapJson) {
                                webMapTextObject.operationalLayers.push(layerAsWebMapJson);
                                thumbnailParams.services.push({
                                    service: layerAsWebMapJson.url,
                                    extra: "&transparent=true",
                                    wrap: true,
                                    opacity: layerAsWebMapJson.opacity
                                });
                            }

                        }
                    }
                    webMapParams.text = json.toJson(webMapTextObject);
                    webMapParams.title = webMapName;
                    return webMapParams;
                },
                createCartLayers: function () {
                    var i, searchLayersByUrl = {}, currentSearchLayer, currentServiceUrl, currentItemByServiceUrlEntry, currentServiceItems, currentServiceObjectId, currentMosaicRule, currentImageServiceLayer, cartItems, currentArchiveItem, currentItemService, itemsByServiceUrl = {}, layers = [];
                    topic.publish("discovery:getSearchResultLayersHash", function (searchL) {
                        searchLayersByUrl = searchL || {};
                    });
                    topic.publish("discovery:getCartItems", function (cartI) {
                        cartItems = cartI;
                    });
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
                                currentSearchLayer = searchLayersByUrl[currentServiceUrl];
                                currentItemByServiceUrlEntry = itemsByServiceUrl[currentServiceUrl];
                                currentServiceItems = currentItemByServiceUrlEntry.items;
                                currentItemService = currentItemByServiceUrlEntry.service;
                                currentServiceObjectId = currentItemService.__fieldConfiguration.objectIdFieldName;
                                currentImageServiceLayer = new ArcGISImageServiceLayer(currentServiceUrl);
                                currentImageServiceLayer.name = currentItemService.label;
                                currentMosaicRule = new MosaicRule();
                                currentMosaicRule.method = MosaicRule.METHOD_LOCKRASTER;
                                currentMosaicRule.ascending = true;
                                currentMosaicRule.operation = MosaicRule.OPERATION_FIRST;
                                currentMosaicRule.lockRasterIds = [];
                                currentImageServiceLayer.setMosaicRule(currentMosaicRule);
                                if (currentSearchLayer && currentSearchLayer.bandIds) {
                                    currentImageServiceLayer.setBandIds(currentSearchLayer.bandIds);
                                }
                                if (currentSearchLayer && currentSearchLayer.renderingRule) {
                                    currentImageServiceLayer.setRenderingRule(currentSearchLayer.renderingRule);

                                }
                                for (i = 0; i < currentServiceItems.length; i++) {
                                    currentArchiveItem = currentServiceItems[i];
                                    currentMosaicRule.lockRasterIds.push(currentArchiveItem.attributes[currentServiceObjectId]);
                                }
                                layers.push(currentImageServiceLayer);
                            }
                        }
                    }
                    return layers;
                },
                layerToWebMapJson: function (layer) {
                    if (layer && layer.url) {
                        var name = layer.label;
                        if (!name) {
                            name = layer.name;
                        }
                        var asWebMapJson = {
                            url: layer.url,
                            id: layer.id,
                            visibility: layer.visible,
                            opacity: layer.opacity != null ? layer.opacity : 1,
                            title: name

                        };
                        if (layer instanceof ArcGISImageServiceLayer) {
                            if (layer.bandIds != null) {
                                asWebMapJson.bandIds = layer.bandIds;
                            }
                            if (layer.renderingRule) {
                                asWebMapJson.renderingRule = layer.renderingRule.toJson();

                            }
                            if (layer.mosaicRule != null && lang.isObject(layer.mosaicRule)) {
                                asWebMapJson.mosaicRule = {
                                    mosaicMethod: layer.mosaicRule.method,
                                    ascending: layer.mosaicRule.ascending,
                                    lockRasterIds: layer.mosaicRule.lockRasterIds,
                                    mosaicOperation: layer.mosaicRule.operation
                                };
                            }
                        }
                        return asWebMapJson;
                    }
                    else {
                        return null;
                    }

                },
                logPortalUserIn: function () {
                    this.portal = portalUtils.getPortal(this.portalUrl);
                    this.portal.signIn().then(lang.hitch(this, function (credential) {
                        this.portal.getUser().then(lang.hitch(this, function (user) {
                            if (user) {
                                if (user.groups) {
                                    this.setUsersGroups(user.groups);
                                }
                                user.getContent().then(lang.hitch(this, function (content) {
                                    if (content && content.folders) {
                                        this.setUsersFolders(content.folders);
                                    }
                                    this.setUserLoggedIn();

                                }));
                            }
                        }));
                    }));
                },
                setUserLoggedIn: function () {
                    domClass.add(this.loggedOutContent, "hidden");
                    domClass.remove(this.loggedInContent, "hidden");
                },
                logPortalUserOut: function (portalUrl) {
                    if (portalUrl === this.portalUrl) {
                        domClass.remove(this.loggedOutContent, "hidden");
                        domClass.add(this.loggedInContent, "hidden");
                    }
                },
                showSharingContent: function () {
                    var webMapName = this.webMapNameInput.get("value");
                    var tags = this.webMapTagsInput.get("value");
                    if (!webMapName) {
                        alert(this.nls.mustProvideWebmapName);
                    }
                    else if (!tags) {
                        alert(this.nls.mustProvideWebmapTag);
                    }
                    else {
                        this.hidePublishInputs();
                        domClass.remove(this.portalPublishShareContainer, "hidden");

                    }
                },
                hideSharingContent: function () {
                    domClass.add(this.portalPublishShareContainer, "hidden");
                },
                showPublishInputs: function () {
                    this.hideSharingContent();
                    domClass.remove(this.portalPublisherContainer, "hidden");
                },
                hidePublishInputs: function () {
                    domClass.add(this.portalPublisherContainer, "hidden");
                },
                setUsersGroups: function (groups) {
                    this.groupCheckboxes = [];
                    domConstruct.empty(this.portalGroupShareList);
                    var i, currentGroup, groupItem, groupCheckbox, groupTitle;
                    for (i = 0; i < groups.length; i++) {
                        currentGroup = groups[i];
                        groupItem = domConstruct.create("li", {className: "portalPublishGroupItem"});
                        domConstruct.place(groupItem, this.portalGroupShareList);
                        groupCheckbox = new CheckBox();
                        groupCheckbox.on("click", lang.hitch(this, this.handleGroupCheckboxClick, groupCheckbox));
                        this.groupCheckboxes.push(groupCheckbox);
                        domConstruct.place(groupCheckbox.domNode, groupItem);
                        groupTitle = domConstruct.create("span", {innerHTML: currentGroup.title});
                        domConstruct.place(groupTitle, groupItem);
                    }
                },
                showPendingSaveButton: function () {
                    if (!domClass.contains(this.portalSaveButton, "pending")) {
                        domClass.add(this.portalSaveButton, "pending");
                    }
                    domAttr.set(this.portalSaveButton, "innerHTML", "<i class='fa fa-spin fa-spinner'></i>");
                    this.checkoutClickDisabled = true;
                },
                cancelPendingSaveButton: function () {
                    if (domClass.contains(this.portalSaveButton, "pending")) {
                        domClass.remove(this.portalSaveButton, "pending");
                    }
                    domAttr.set(this.portalSaveButton, "innerHTML", this.nls.save);
                    this.checkoutClickDisabled = false;
                }
            });
    });