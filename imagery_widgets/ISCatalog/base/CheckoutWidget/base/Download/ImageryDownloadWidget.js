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
        "dojo/text!./template/ImageryDownloadTemplate.html",
        "dojo/topic",
        "dojo/_base/json",
        "dojo/_base/array",
        "dojo/_base/lang",
        "dijit/_WidgetBase",
        "dijit/_TemplatedMixin",
        'dijit/_WidgetsInTemplateMixin',
        "./ImageryDownloadListWidget",
        "dijit/form/Button",
        "dojo/Deferred",
        "../../../BaseDiscoveryMixin",
        "dojo/dom-class",
        "esri/IdentityManager"
    ],
    function (declare, template, topic, json, array, lang, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, ImageryDownloadListWidget, Button, Deferred, BaseDiscoveryMixin, domClass, IdentityManager) {
        return declare(
            [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, BaseDiscoveryMixin],
            {
                downloadLimitExceedServerDetailString: "The requested number of download images exceeds the limit.",
                bytesInMB: 1048576,
                templateString: template,

                actionButtonLabel: "Generate",
                constructor: function (params) {
                    lang.mixin(this, params || {});
                    this.imageryExportDownloadWindowTitle = this.nls.yourFilesHaveBeenPrepared;
                    this.pendingDownloadRequests = 0;
                    this.currentDownloadResponses = [];
                    this.hasDownloadItems = false;
                },
                postCreate: function () {
                    this.inherited(arguments);
                    this._createDownloadListWidget();
                },
                _createDownloadListWidget: function () {
                    this.downloadListWidget = new ImageryDownloadListWidget({
                        nls: this.nls
                    });
                    this.downloadListWidget.placeAt(this.downloadListWidgetContainer);
                },
                clearDownloadList: function () {
                    this.downloadListWidget.clearDownloadList();
                },
                populateDownloadLinks: function (features) {
                    var def = new Deferred();
                    this.handleGenerateDownloadLinks(features).then(lang.hitch(this, function (responses) {
                        if (!responses) {
                            def.resolve(false);
                        }
                        domClass.add(this.downloadListThrobber, "hidden");
                        domClass.remove(this.downloadListWidgetContainer, "hidden");
                        this.downloadListWidget.setDownloadList(responses);
                        def.resolve(true);
                    }));
                    return def;
                },
                /**
                 * handles the bulk of the imagery export
                 */
                handleGenerateDownloadLinks: function (features) {
                    var cred, params, def = new Deferred(), downloadResponses = {}, objectIdArray, key, i, currentFeature, currentServiceLabel, currentServiceConfiguration, currentDownloadItemObj, serviceUrlToObjectIds = {}, pendingDownloadCount = 0, currentServiceObjIdField, currentObjectId;
                    domClass.add(this.downloadListWidgetContainer, "hidden");
                    domClass.remove(this.downloadListThrobber, "hidden");
                    //group by service
                    for (i = 0; i < features.length; i++) {
                        currentFeature = features[i];
                        currentServiceConfiguration = currentFeature[this.COMMON_FIELDS.SERVICE_FIELD];
                        currentServiceLabel = currentServiceConfiguration.label;

                        if (!serviceUrlToObjectIds[currentServiceConfiguration.url]) {
                            objectIdArray = [];
                            serviceUrlToObjectIds[currentServiceConfiguration.url] = {
                                objectIds: objectIdArray,
                                serviceLabel: currentServiceLabel
                            };
                            pendingDownloadCount++;
                        }
                        objectIdArray = serviceUrlToObjectIds[currentServiceConfiguration.url].objectIds;
                        currentServiceObjIdField = currentServiceConfiguration.__fieldConfiguration.objectIdFieldName;
                        currentObjectId = currentFeature.attributes[currentServiceObjIdField];
                        objectIdArray.push(currentObjectId);
                    }
                    if (!pendingDownloadCount) {
                        def.resolve(null);
                        return def;
                    }
                    for (key in serviceUrlToObjectIds) {
                        if (serviceUrlToObjectIds.hasOwnProperty(key)) {
                            currentDownloadItemObj = serviceUrlToObjectIds[key];
                            cred = IdentityManager.findCredential(currentServiceConfiguration.url);
                            params = {
                                f: "json",
                                rasterIds: currentDownloadItemObj.objectIds.join(",")
                            };
                            if (cred) {
                                params.token = cred.token;
                            }
                            this.loadJsonP(this.joinUrl(currentServiceConfiguration.url, "download"), params, lang.hitch(this, function (currentServiceConfiguration, serviceLabel, response) {
                                pendingDownloadCount--;
                                downloadResponses[serviceLabel] = this._processDownloadResponse(response, currentServiceConfiguration, serviceLabel);
                                if (pendingDownloadCount < 1) {
                                    def.resolve(downloadResponses);
                                }
                            }, currentServiceConfiguration, currentDownloadItemObj.serviceLabel), lang.hitch(this, function (err) {
                                if (err && err.message) {
                                    this.showError(err.message);
                                }
                                else {
                                    this.showError(this.nls.errorDownloadingFile);
                                }
                                pendingDownloadCount--;
                                if (pendingDownloadCount < 1) {
                                    def.resolve(downloadResponses);
                                }
                            }));
                        }
                    }
                    return def;
                },
                _processDownloadResponse: function (downloadResponse, currentServiceConfiguration, serviceLabel) {
                    var i, currentRasterFileRasterId,currentDownloadItem, downloadUrl, rasterIdToDownloadObjects = {}, serviceUrl = currentServiceConfiguration.url;
                    if (downloadResponse && downloadResponse.rasterFiles) {
                        for (i = 0; i < downloadResponse.rasterFiles.length; i++) {
                            currentDownloadItem = downloadResponse.rasterFiles[i];
                            //todo: why is raster ids an array
                            if (currentDownloadItem && currentDownloadItem.rasterIds && currentDownloadItem.rasterIds.length > 0) {
                                if (!rasterIdToDownloadObjects[currentDownloadItem.rasterIds[0]]) {
                                    rasterIdToDownloadObjects[currentDownloadItem.rasterIds[0]] = [];
                                }
                                var fileName = this.getFileNameFromAtEndOfPath(currentDownloadItem.id);
                                if (currentServiceConfiguration.downloadUrlModifier) {
                                    downloadUrl = this._modifyDownloadUrl(currentServiceConfiguration, currentDownloadItem);
                                }
                                else {
                                    currentRasterFileRasterId = currentDownloadItem.rasterIds[0];
                                    downloadUrl = this.joinUrl(serviceUrl, ("file?id=" + currentDownloadItem.id)) + "&rasterId=" + currentRasterFileRasterId;
                                }
                                var addDownloadItem = {
                                    id: currentDownloadItem.id,
                                    url: downloadUrl,
                                    label: fileName,
                                    serviceName: serviceLabel
                                };
                                if (!currentServiceConfiguration.hideDownloadSize) {
                                    if (currentDownloadItem.size || currentDownloadItem.size === 0) {
                                        addDownloadItem.size = this.humanFileSize(currentDownloadItem.size);
                                    }
                                    else {
                                        addDownloadItem.size = "? MB"
                                    }
                                }
                                rasterIdToDownloadObjects[currentDownloadItem.rasterIds[0]].push(addDownloadItem);
                            }
                        }
                    }
                    return rasterIdToDownloadObjects;
                },
                _modifyDownloadUrl: function (currentServiceConfiguration, downloadItem) {
                    var i, re, curr, type, downloadUrlModifier = currentServiceConfiguration.downloadUrlModifier;
                    var downloadUrl = downloadItem.id;
                    if (downloadUrlModifier && downloadUrlModifier.replacement && downloadUrlModifier.replacement.length) {
                        for (i = 0; i < downloadUrlModifier.replacement.length; i++) {
                            curr = downloadUrlModifier.replacement[i];
                            if (curr && curr.type) {
                                type = curr.type.toString().toLowerCase();
                                if (type === "replace" && curr.pattern && curr.pattern.regexp) {
                                    re = new RegExp(curr.pattern.regexp, curr.pattern.options ? curr.pattern.options : "");
                                    downloadUrl = downloadUrl.replace(re, curr.replacement ? curr.replacement : "");
                                }
                                else if (type === "prepend") {
                                    downloadUrl = curr.text + downloadUrl;
                                }
                            }
                        }
                    }
                    return downloadUrl;
                }
            });
    });
