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
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-attr",
    "dojo/dom-construct",
    "./BaseDiscoveryMixin",
    "dojo/_base/array",
    "dojo/on" ,
    "dijit/TooltipDialog",
    "dijit/popup",
    "dojo/dom-style",
    
],
    function (declare, lang, domClass, domAttr, domConstruct, BaseDiscoveryMixin, array, on, TooltipDialog, popup, domStyle) {
        return declare([ BaseDiscoveryMixin], {
            blockThumbHover: false,
            _downloadLimitExceedServerDetailString: "The requested number of download images exceeds the limit.",
            bytesInMB: 1048576,
            downloadEnabled: false,
            inlineDownloadLink: true,
            zoomToResultOnClick: false,
            baseResultEntryName: "discoveryResultEntry",
            borderedResultItems: true,
            thumbnailMouseOverEnabled: false,
            createRemoveIconOnResultItems: true,
            createPreviewToggler: false,
            createCartToggler: false,
            constructor: function () {
                this.tooltipCache = [];
                this.itemPriceElementByFeatureIdCache = {};
                this.itemAreaElementByFeatureIdCache = {};
                this.archiveLoadThumbnailErrorFnx = lang.hitch(this, this._handleLoadArchiveThumbError);
            },
            clear: function () {
                this.itemPriceElementByFeatureIdCache = {};
                this.itemAreaElementByFeatureIdCache = {};
                this.clearTooltipCache();
            },
            clearTooltipCache: function () {
                if (this.tooltipCache && this.tooltipCache.length > 0) {
                    var i;
                    for (i = 0; i < this.tooltipCache.length; i++) {
                        this.tooltipCache[i].destroy();
                    }
                }
            },
            _createResultItem: function (feature) {
                if (feature) {
                    return this._createArchiveItem(feature);
                }
                return null;
            },
            _createArchiveItem: function (feature) {
                var thumbHoverIcon, cartItemActionsContainer, detailFields, displayFields, attributes, archiveDetailsString, archiveDetailsOuter, archiveDetailsLabel, infoElement, tooltip, currentFeatureService, currentEntryElement, entryDetailsContainer , archiveThumb, j, value, currentEntryDetailElement, displayField, removeFromCartIcon, downloadContainer, downloadIcon, payIcon;
                attributes = feature.attributes;
                currentFeatureService = feature[this.COMMON_FIELDS.SERVICE_FIELD];
                detailFields = currentFeatureService && currentFeatureService.detailsFields ? currentFeatureService.detailsFields : [];
                displayFields = currentFeatureService && currentFeatureService.displayFields ? currentFeatureService.displayFields : [];

                currentEntryElement = domConstruct.create("li", {className: this.baseResultEntryName});
                if (this.borderedResultItems) {
                    domClass.add(currentEntryElement, "bordered");
                }
                if (this.createRemoveIconOnResultItems) {
                    removeFromCartIcon = domConstruct.create("i", {className: this.baseResultEntryName + "RemoveIcon fa fa-times", title: this.nls.remove});
                    on(removeFromCartIcon, "click", lang.hitch(this, this.removeItemFromCart, feature, currentEntryElement));
                    domConstruct.place(removeFromCartIcon, currentEntryElement);
                }
                if (feature[this.COMMON_FIELDS.THUMBNAIL_FIELD]) {
                    archiveThumb = domConstruct.create("img", {className: this.baseResultEntryName + "Thumb", src: feature[this.COMMON_FIELDS.THUMBNAIL_FIELD]});
                    on(archiveThumb, "error", this.archiveLoadThumbnailErrorFnx);
                    if (this.thumbnailMouseOverEnabled) {
                        domStyle.set(archiveThumb, "cursor", "pointer");
                        on(archiveThumb, "mouseover", lang.hitch(this, this._showExtentGeometry, feature));
                        on(archiveThumb, "mouseout", lang.hitch(this, this._hideExtentGeometry, feature));

                    }
                    if (this.zoomToResultOnClick) {
                        on(archiveThumb, "click", lang.hitch(this, this._zoomToResult, feature));

                    }
                    domConstruct.place(archiveThumb, currentEntryElement);
                }


                entryDetailsContainer = domConstruct.create("ul", {className: this.baseResultEntryName + "DetailsList"});
                domConstruct.place(entryDetailsContainer, currentEntryElement);
                for (j = 0; j < displayFields.length; j++) {
                    value = null;
                    displayField = displayFields[j];
                    if (displayField.displayValue) {
                        value = displayField.displayValue;
                    }
                    else {
                        if (attributes[displayField.name] || attributes[displayField.name] === 0) {
                            value = attributes[displayField.name];

                        }
                        else if (feature[displayField.name] || feature[displayField.name] === 0) {
                            value = feature[displayField.name];
                        }
                        if (displayField.valueReplacementMap && (displayField.valueReplacementMap[value] || displayField.valueReplacementMap[value] === 0)) {
                            value = displayField.valueReplacementMap[value];
                        }
                    }
                    if (value || value === 0) {
                        if (array.indexOf(currentFeatureService.__fieldConfiguration.dateFields, displayField.name) > -1) {
                            value = this.getDateString(value, this.useUTCDate, this.dateFormat);
                        }
                        else {
                            if ((displayField.precision || displayField.precision === 0) && value.toFixed) {
                                value = value.toFixed(displayField.precision);
                            }
                            if (displayField.displayMultiplier) {
                                value = Math.ceil(value * displayField.displayMultiplier);
                            }
                        }
                        value = value.toString();
                        if (displayField.valuePrepend) {
                            value = displayField.valuePrepend + value;
                        }
                        if (displayField.valueAppend) {
                            value += displayField.valueAppend;
                        }
                        currentEntryDetailElement = domConstruct.create("li");
                        if (!isNaN(value)) {
                            value = parseFloat(value).toFixed(2);
                        }
                        domAttr.set(currentEntryDetailElement, "innerHTML", displayField.label + (displayField.label.length > 0 ? ": " : "") + value);
                        if (displayField.cssClasses) {
                            domClass.add(currentEntryDetailElement, displayField.cssClasses);
                        }
                        domConstruct.place(currentEntryDetailElement, entryDetailsContainer);
                    }
                }
                cartItemActionsContainer = domConstruct.create("div", {className: this.baseResultEntryName + "ActionsContainer"});


                if (feature[this.COMMON_FIELDS.SHOW_THUMB_ON_HOVER] && !this.blockThumbHover) {
                    thumbHoverIcon = domConstruct.create("i", {className: this.baseResultEntryName + "MapImageThumb fa fa-eye"});
                    domStyle.set(archiveThumb, "cursor", "pointer");
                    on(thumbHoverIcon, "mouseover", lang.hitch(this, this._showMapImageThumb, feature));
                    on(thumbHoverIcon, "mouseout", lang.hitch(this, this._hideMapImageThumb, feature));
                    domConstruct.place(thumbHoverIcon, cartItemActionsContainer);
                }
                domConstruct.place(cartItemActionsContainer, currentEntryElement);
                if (this.createCartToggler) {
                    domConstruct.place(this._getCartToggler(feature), cartItemActionsContainer);
                }

                archiveDetailsString = this.getArchiveDetailsString(feature, detailFields, {
                    useUTCDate: this.useUTCDate,
                    dateFormat: this.dateFormat
                });
                if (archiveDetailsString) {
                    archiveDetailsOuter = domConstruct.create("div", {className: this.baseResultEntryName + "InfoButton"});
                    archiveDetailsLabel = domConstruct.create("span", {innerHTML: this.nls.info});
                    infoElement = domConstruct.create("i", {className: this.baseResultEntryName + "InfoIcon fa fa-tag"});
                    domConstruct.place(infoElement, archiveDetailsOuter);
                    domConstruct.place(archiveDetailsLabel, archiveDetailsOuter);
                    domConstruct.place(archiveDetailsOuter, cartItemActionsContainer);
                    tooltip = new TooltipDialog({
                        content: archiveDetailsString
                    });
                    tooltip.__visible = false;
                    tooltip.__clickNode = archiveDetailsOuter;
                    on(archiveDetailsOuter, "click", lang.hitch(this, this._toggleInfoPopup, tooltip));
                    this.tooltipCache.push(tooltip);
                }

                if (this.createPreviewToggler && !feature[this.COMMON_FIELDS.DISABLE_IMAGE_PREVIEW]) {
                    domConstruct.place(this._getPreviewToggler(feature), cartItemActionsContainer);
                }

                if (this.downloadEnabled && currentFeatureService.downloadEnabled) {
                    downloadContainer = domConstruct.create("div", {className: this.baseResultEntryName + "DownloadIcon"});
                    downloadIcon = domConstruct.create("i", {className: "fa fa-download"});
                    domConstruct.place(downloadIcon, downloadContainer);
                    if (this.inlineDownloadLink) {
                        domConstruct.place(downloadContainer, cartItemActionsContainer);

                    }
                    else {
                        domConstruct.place(downloadContainer, currentEntryElement);

                    }
                    on(downloadContainer, "click", lang.hitch(this, this._onDownloadImageRequest, feature));

                }

                return currentEntryElement;
            },
            _zoomToResult: function (feature) {
                this.onZoomToResult(feature);
            },
            onZoomToResult: function (feature) {

            },

            _showMapImageThumb: function (feature) {
                this.onShowMapImageThumb(feature);
            },
            onShowMapImageThumb: function (feature) {

            },
            _hideMapImageThumb: function (feature) {
                this.onHideMapImageThumb(feature);
            },
            onHideMapImageThumb: function (feature) {

            },
            _showExtentGeometry: function (feature) {
                this.onShowExtentGeometry(feature);
            },
            onShowExtentGeometry: function (feature) {

            },
            _hideExtentGeometry: function (feature) {
                this.onHideExtentGeometry(feature);
            },
            onHideExtentGeometry: function (feature) {

            },
            _toggleInfoPopup: function (tooltip, e) {
                if (tooltip) {
                    if (tooltip.__visible) {
                        this._hideTooltip(tooltip);
                    }
                    else {
                        this.closeCurrentResultPopup();

                        this._showTooltip(tooltip);

                    }
                }
            },
            _hideTooltip: function (tooltip) {
                popup.close(
                    tooltip
                );
                if (domClass.contains(tooltip.__clickNode, "active")) {
                    domClass.remove(tooltip.__clickNode, "active");
                }
                tooltip.__visible = false;
                if (this.currentResultTooltip && this.currentResultTooltip === tooltip) {
                    this.currentResultTooltip = null;
                }
            },
            _showTooltip: function (tooltip) {

                popup.open({
                    popup: tooltip,
                    around: tooltip.__clickNode
                });
                if (!domClass.contains(tooltip.__clickNode, "active")) {
                    domClass.add(tooltip.__clickNode, "active");
                }
                tooltip.__visible = true;
                this.currentResultTooltip = tooltip;
            },
            closeCurrentResultPopup: function () {
                if (this.currentResultTooltip) {
                    this._hideTooltip(this.currentResultTooltip);
                }
            },

            _getCartToggler: function (feature) {
                var addToCartContainer, cartIcon, cartLabel;
                addToCartContainer = domConstruct.create("span", {className: this.baseResultEntryName + "AddToCartContainer"});
                if (feature[this.COMMON_FIELDS.ADDED_TO_CART_FIELD]) {
                    domClass.add(addToCartContainer, "active");
                }
                cartIcon = domConstruct.create("i", {className: "fa fa-shopping-cart"});
                cartLabel = domConstruct.create("span", {className: "addToCartLabel",
                    innerHTML: ( feature[this.COMMON_FIELDS.ADDED_TO_CART_FIELD] ? this.nls.remove : this.nls.addToCart)});
                on(addToCartContainer, "click", lang.hitch(this, this._toggleAddItemToCart, feature, cartLabel, addToCartContainer));
                domConstruct.place(cartIcon, addToCartContainer);
                domConstruct.place(cartLabel, addToCartContainer);
                return addToCartContainer;
            },
            _getPreviewToggler: function (feature) {
                var previewContainer, previewIcon, previewLabel;
                previewContainer = domConstruct.create("span", {title: this.nls.imagePreview, className: this.baseResultEntryName + "PreviewContainer" + (feature[this.COMMON_FIELDS.IS_PREVIEW_FIELD] ? " active" : "")});
                previewIcon = domConstruct.create("i", { className: (this.baseResultEntryName + "PreviewIcon fa fa-picture-o")});
                previewLabel = domConstruct.create("span", {innerHTML: this.nls.preview});
                on(previewContainer, "click", lang.hitch(this, this._togglePreviewItem, feature, previewIcon, previewContainer));
                domConstruct.place(previewIcon, previewContainer);
                domConstruct.place(previewLabel, previewContainer);
                return previewContainer;
            },
            _toggleAddItemToCart: function () {

            },
            _togglePreviewItem: function (feature, previewIcon, previewContainer) {
                var eventHandle;
                var previewVisibleBeforeToggle, hideSensorType, onLoadCallback = null;
                if (previewIcon && domClass.contains(previewIcon, "fa-spinner")) {
                    return;
                }
                previewVisibleBeforeToggle = feature[this.COMMON_FIELDS.IS_PREVIEW_FIELD];
                feature[this.COMMON_FIELDS.IS_PREVIEW_FIELD] = !feature[this.COMMON_FIELDS.IS_PREVIEW_FIELD];
                if (previewIcon && previewVisibleBeforeToggle) {
//                    domClass.remove(previewIcon, "previewActive");
                    
                    domClass.remove(previewContainer, "active");
                    
                }
                else {
                    if (previewIcon) {
                        if (!domClass.contains(previewIcon, "fa-spinner")) {
                            domClass.add(previewIcon, "fa-spin fa-spinner");
                            onLoadCallback = lang.hitch(this, function () {
                                //set to active after the layer has been loaded
                                domClass.remove(previewIcon, "fa-spin fa-spinner");
                                domClass.add(previewContainer, "active");                                
                            }, previewIcon);
                        }
                    }
                    
                }
                this.onTogglePreviewItem(feature, onLoadCallback);

            },
            onTogglePreviewItem: function (feature, onLoadCallback) {

            },
            
       
            
            _handleLoadArchiveThumbError: function (e) {
                if (e && e.target) {
                    domAttr.set(e.target, "src", this.thumbnailLoadErrorImage);
                }
            },
            setAutomaticFieldConfiguration: function (automaticFieldConfiguration) {
                this.automaticFieldConfiguration = automaticFieldConfiguration;
            },
            setInstantFieldConfiguration: function (instantFieldConfiguration) {
                this.instantFieldConfiguration = instantFieldConfiguration;
            },
            removeItemFromCart: function (feature, element) {
                domConstruct.destroy(element);
                this._onRemoveItemFromCart(feature);
            },

            _onRemoveItemFromCart: function (feature) {
                this.closeCurrentResultPopup();
                this.onRemoveItemFromCart(feature);
            },
            onRemoveItemFromCart: function (feature) {

            },
            _onDownloadImageRequest: function (feature) {
                this.onDownloadImageRequest(feature);
            },
            onDownloadImageRequest: function (feature) {

            }
        });
    })
;
