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
        "dojo/dom-construct",
        "dojo/_base/lang",
        "dojo/_base/json",
        "esri/tasks/Geoprocessor",
        "dojo/text!./template/ImageryDownloadListTemplate.html",
        "dijit/_WidgetBase",
        "dijit/_TemplatedMixin",
        'dijit/_WidgetsInTemplateMixin'
    ],
    function (declare, topic, domConstruct, lang, json, Geoprocessor, template, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin) {
        return declare(
            [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin],
            {
                templateString: template,
                constructor: function (params) {
                    lang.mixin(this, params || {});
                    this.downloadAllConfiguration = null;
                },
                postCreate: function () {
                    this.inherited(arguments);
                    this.handleDownloadAllItemsTaskErrorCallback = lang.hitch(this, this._handleDownloadAllItemsError);
                    this.handleDownloadAllItemsTaskResponseCallback = lang.hitch(this, this._handleDownloadAllItemsResponse);
                    this.handleProcessDownloadUrlCallback = lang.hitch(this, this._handleProcessDownloadUrl);
                },
                clearDownloadList: function () {
                    domConstruct.empty(this.imageryDownloadListContainer);
                },
                setDownloadList: function (downloadItems) {
                    //clear the previous list
                    this.clearDownloadList();
                    if (!downloadItems) {
                        return;
                    }
                    var i, currentServiceName, currentServiceDownloadEntry, currentFeatureId, currentServiceLinks, currentServiceLink, serviceEntryNode, serviceLinksList, linkListItem, linkNode, linkSizeNode;
                    //loop through download items object and add them to the view model
                    for (currentServiceName in downloadItems) {
                        if (downloadItems.hasOwnProperty(currentServiceName)) {
                            currentServiceDownloadEntry = downloadItems[currentServiceName];
                            serviceEntryNode = domConstruct.create("div", {className: "downloadServiceEntry"});
                            domConstruct.place(serviceEntryNode, this.imageryDownloadListContainer);
                            for (currentFeatureId in currentServiceDownloadEntry) {
                                if (currentServiceDownloadEntry.hasOwnProperty(currentFeatureId)) {
                                    currentServiceLinks = currentServiceDownloadEntry[currentFeatureId];
                                    serviceLinksList = domConstruct.create("ul", {className: "imageryDownloadLinkList"});
                                    domConstruct.place(serviceLinksList, serviceEntryNode);
                                    for (i = 0; i < currentServiceLinks.length; i++) {
                                        currentServiceLink = currentServiceLinks[i];
                                        linkListItem = domConstruct.create("li");
                                        domConstruct.place(linkListItem, serviceLinksList);
                                        linkNode = domConstruct.create("a", {
                                            innerHTML: currentServiceLink.label,
                                            href: currentServiceLink.url,
                                            target: "_blank"
                                        });
                                        domConstruct.place(linkNode, linkListItem);
                                        if (currentServiceLink.size) {
                                            linkSizeNode = domConstruct.create("span", {
                                                className: "exportDownloadListSizeValue",
                                                innerHTML: "(" + currentServiceLink.size + ")"
                                            });
                                            domConstruct.place(linkSizeNode, linkListItem);

                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                /**
                 *
                 * @description listener for IMAGERY_GLOBALS.EVENTS.DOWNLOAD.DOWNLOAD_ALL_IMAGERY
                 * @param {Array} downloadItems  array of URLs to download url,label
                 * @private
                 */
                _handleDownloadAllImagery: function (downloadItems) {
                    var downloadFiles = [];
                    var currentDownloadItem = null;
                    for (var i = 0; i < downloadItems.length; i++) {
                        currentDownloadItem = downloadItems[i];
                        //get the child files
                        for (var j = 0; j < currentDownloadItem.values.length; j++) {
                            downloadFiles.push(currentDownloadItem.values[j]);
                        }
                    }
                    var jsonString = json.toJson(downloadFiles);
                    this._submitDownloadImageryJob(downloadFiles);
                },
                /**
                 * @description sends request to download GP task for downloading all imagery
                 * @param downloadArray
                 * @private
                 */
                _submitDownloadImageryJob: function (downloadArray) {
                    if (this.downloadAllImageryTask == null) {
                        this.downloadAllImageryTask = new Geoprocessor(this.downloadAllConfiguration.task.url);
                    }
                    var gpParams = {};
                    gpParams[this.downloadAllConfiguration.task.downloadItemInputParameter] = json.toJson(downloadArray);
                    this.viewModel.downloadAllInFlight(true);
                    if (this.downloadAllConfiguration.task.isAsync == null || this.downloadAllConfiguration.task.isAsync) {
                        this.downloadAllImageryTask.submitJob(gpParams, this.handleDownloadAllItemsTaskResponseCallback, null,
                            this.handleDownloadAllItemsTaskErrorCallback);
                    }
                    else {
                        this.downloadAllImageryTask.execute(gpParams, this.handleDownloadAllItemsTaskResponseCallback,
                            this.handleDownloadAllItemsTaskErrorCallback);
                    }
                },
                /**
                 * @description called when download all items finishes
                 * @param response
                 * @private
                 */
                _handleDownloadAllItemsResponse: function (response) {
                    if (response == null || !lang.isObject(response) || response.results == null) {
                        return;
                    }
                    if (response.results[this.downloadAllConfiguration.task.outputUrlParameter] != null) {
                        //get the output URL
                        this.downloadAllImageryTask.getResultData(response.jobId, this.downloadAllConfiguration.task.outputUrlParameter, this.handleProcessDownloadUrlCallback);
                    }
                    else {
                    }
                },
                /**
                 * @description called when download all geoprocessing task failes
                 * @param err
                 * @return {null}
                 * @private
                 */
                _handleDownloadAllItemsError: function (err) {
                    return null;
                },
                /**
                 * @description sets the window location to the download url
                 * @param urlResponse
                 * @private
                 */
                _handleProcessDownloadUrl: function (urlResponse) {
                    if (urlResponse == null || !lang.isObject(urlResponse) || urlResponse.value == null || !lang.isObject(urlResponse.value) || urlResponse.value.url == null) {
//                        this.viewModel.downloadAllLink(null);
                    }
                    else {
//                        this.viewModel.downloadAllLink(urlResponse.value.url)

                    }
                },
                handleDownloadAll: function () {

                }
            });
    });
