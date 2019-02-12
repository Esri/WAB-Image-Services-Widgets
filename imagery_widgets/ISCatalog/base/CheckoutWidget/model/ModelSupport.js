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
        "dojo/dom-class",
        "dojo/dom-attr",
        "dojo/dom-construct",
        "dojo/query",
        "../../BaseDiscoveryMixin",
        "dijit/ProgressBar"
    ],
    function (declare, domClass, domAttr, domConstruct, query, BaseDiscoveryMixin, ProgressBar) {
        return declare([BaseDiscoveryMixin], {
            /**
             * adds message from checkout handler
             * @param messageContainer
             * @param message
             * @param clear
             */
            addCheckoutElement: function (messageContainer, message, clear) {
                if (clear) {
                    domConstruct.empty(messageContainer);
                }
                var messageListItem;
                if (messageContainer && message) {
                    messageListItem = domConstruct.create("li", {className: "checkoutMessageEntry"});
                    if (typeof message === "string") {
                        domAttr.set(messageListItem, "innerHTML", message);
                    }
                    else {
                        domConstruct.place(message, messageListItem);
                    }
                    domConstruct.place(messageListItem, messageContainer);
                }
            },
            /**
             * creates a container for checkout handler messages
             */
            createCheckoutMessageContainer: function () {
                var container, messageList;
                container = domConstruct.create("div", {className: "checkoutMessageContainer"});
                messageList = domConstruct.create("ul", {className: "checkoutMessageList"});
                domConstruct.place(messageList, container);
                domConstruct.place(container, this.cartItemsCheckoutMessageContainer);
                return messageList;
            },
            /**
             * creates the checkout progress bar
             * @private
             */
            _createProgressBar: function () {
                this.progressBar = new ProgressBar({
                    indeterminate: true
                }, this.progressBarContainer);
                this.progressBarDomNode = this.progressBar.domNode;
            },
            hideRemoveFromCartIcons: function () {
                var i, removeFromCartElements = query("." + this.baseResultEntryName + "RemoveIcon", this.orderItemsContainer);
                for (i = 0; i < removeFromCartElements.length; i++) {
                    this._hideNode(removeFromCartElements[i]);
                }
            },
            showRemoveFromCartIcons: function () {
                var i, removeFromCartElements = query("." + this.baseResultEntryName + "RemoveIcon", this.orderItemsContainer);
                for (i = 0; i < removeFromCartElements.length; i++) {
                    this._showNode(removeFromCartElements[i]);
                }
            },
            hideMessageContainer: function () {
                this._hideNode(this.cartItemsCheckoutMessageContainer);
            },
            showMessageContainer: function () {
                this._showNode(this.cartItemsCheckoutMessageContainer);
            },
            showCheckoutCompleteButton: function () {
//                this._showNode(this.checkoutStatusCloseButton);
            },
            _hideNode: function (node) {
                if (!domClass.contains(node, "hidden")) {
                    domClass.add(node, "hidden");
                }
            },
            _showNode: function (node) {
                if (domClass.contains(node, "hidden")) {
                    domClass.remove(node, "hidden");
                }
            },
            hideCSVExportTab: function () {
                this._hideNode(this.csvExportTabContent);
                domClass.remove(this.csvExportTab, "enabled");

            },
            showCSVExportTab: function () {
                if (domClass.contains(this.csvExportTab, "enabled")) {
                    return;
                }
                this.hideWebmapTab();
                this.hideDownloadTab();
                this._showNode(this.csvExportTabContent);
                domClass.add(this.csvExportTab, "enabled");
                if (this.csvExportWidget) {
                    this.csvExportWidget.generateExportLinks();
                }
            }
            ,
            showWebmapTab: function () {
                if (this.webmapWidget) {
                    if (domClass.contains(this.webmapTab, "enabled")) {
                        return;
                    }
                    this.hideDownloadTab();
                    this.hideCSVExportTab();
                    this._showNode(this.webmapTabContent);
                    this.webmapWidget.showInputsContent();
                }

                domClass.add(this.webmapTab, "enabled");
            }
            ,
            hideWebmapTab: function () {
                this._hideNode(this.webmapTabContent);
                domClass.remove(this.webmapTab, "enabled");
            }
            ,
            showDownloadTab: function () {
                if (domClass.contains(this.downloadTab, "enabled")) {
                    return;
                }
//                this.hideReportingTab();
                this.hideWebmapTab();
                this.hideCSVExportTab();
                this._showNode(this.downloadTabContent);
                domClass.add(this.downloadTab, "enabled");
            }
            ,
            hideDownloadTab: function () {
                this._hideNode(this.downloadTabContent);
                domClass.remove(this.downloadTab, "enabled");
            } ,
            disableCSVExportFunctionality: function () {
                this._hideNode(this.csvExportTab);
            },
            disableWebmapFunctionality: function () {
                this._hideNode(this.webmapTab);
            }
            ,
            disableDownload: function () {
                this._hideNode(this.downloadTabContent);
                this._hideNode(this.downloadTab);
                this.showWebmapTab();
            }
            ,
            enableDownload: function () {
                this._showNode(this.downloadTab);
                this.showDownloadTab();
            }
            ,
            showReportingTab: function () {
                /*
                 if (domClass.contains(this.reportingTab, "enabled")) {
                 return;
                 }
                 this.hideDownloadTab();
                 this.hideWebmapTab();
                 this._showNode(this.reportingTabContent);
                 domClass.add(this.reportingTab, "enabled");
                 */
            }
            ,
            hideReportingTab: function () {
//                this._hideNode(this.reportingTabContent);
//                domClass.remove(this.reportingTab, "enabled");
            }

        });
    })
;