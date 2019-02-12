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

define(["dojo/_base/declare",
        "jimu/BaseWidget",
        "dojo/dom-class",
        "dojo/dom-style",
        "dojo/dom-construct",
        "dojo/dom-attr",
        "dojo/_base/lang",
        "../../../BaseDiscoveryMixin",
        "dgrid/OnDemandList",
        "dojo/store/Memory",
        "dojo/query",
        "dojo/has",
        "dojo/_base/sniff",
        "../../../BaseResultCreation"
    ],
    function (declare, BaseWidget, domClass, domStyle, domConstruct, domAttr, lang, BaseDiscoveryMixin, OnDemandList, Memory, query, has, sniff, BaseResultCreation) {
        return declare([BaseWidget, BaseDiscoveryMixin, BaseResultCreation], {
            zoomToResultOnClick: true,
            createRemoveIconOnResultItems: false,
            thumbnailMouseOverEnabled: true,
            borderedResultItems: false,
            createPreviewToggler: true,
            createCartToggler: true,
            thumbnailLoadErrorImage: "",
            useUTCDate: true,
            dateFormat: "dd MMM yyyy",
            _defaultDateFormat: "dd MMM yyyy",
            constructor: function (params) {
                this.currentCostObject = null;
                lang.mixin(this, params || {});
                this._dateConfig = {
                    dateFormat: this.dateFormat || this._defaultDateFormat,
                    useUTCDate: (!this.useUTCDate && this.useUTCDate !== false) ? true : this.useUTCDate
                };
            },

            postCreate: function () {
                this.inherited(arguments);
                domStyle.set(this.domNode, "height", "100%");
                this._createList();
            },
            clear: function () {
                this.currentCostObject = null;
                this.inherited(arguments);
                this.clearList();
                this.clearCartOnlyMode();
                this.closeCurrentResultPopup();

            },
            _createList: function () {
                this._resultsList = new OnDemandList({
                    minRowsPerPage: 1,
                    bufferRows: 1,
                    renderRow: lang.hitch(this, this._renderRow)//,
                    //  farOffRemoval: Infinity
                    

                });
                //    this._resultsList.removeRow = function () {
                //    };
                domConstruct.place(this._resultsList.domNode, this.domNode);
                if (has("ie") && has("ie") < 10) {
                    this._handleIEScrollWidth();
                }
                
                this._resultsList.startup();
                
            },
            _handleIEScrollWidth: function () {
                if (this._resultsList.domNode) {
                    var res = query(".dgrid-scroller", this._resultsList.domNode);
                    if (res && res.length > 0) {
                        domStyle.set(res[0], "width", "105%");
                    }
                }
            },
            setResults: function (resultItems) {
                this.resetQuery();
                var memoryParameters;
                memoryParameters = {data: resultItems, idProperty: this.COMMON_FIELDS.RESULT_ID_FIELD};
                this.resultsStore = new Memory(memoryParameters);
                this._resultsList.set('store', this.resultsStore);
            },
            addResultItem: function (resultItem) {
                if (resultItem && this.resultsStore) {
                    this.resultsStore.put(resultItem);
                }
            },
            _renderRow: function (feature) {
                if (feature && feature.attributes) {
                    return this._createArchiveItem(feature);
                }
                return null;
            },
            getCartItemCount: function () {
                if (!this.resultsStore) {
                    return 0;
                }
                var queryParams = {}, results;
                queryParams[this.COMMON_FIELDS.ADDED_TO_CART_FIELD] = true;
                results = this.resultsStore.query(queryParams);
                return results.length;
            },
            setSort: function (sortObj) {
                if (!sortObj) {
                    return;
                }
                this._resultsList.set("sort", sortObj.sortField, sortObj.descending);
            },
            setResultFilter: function (featureFilter) {
                if (!this.resultsStore || !featureFilter) {
                    return;
                }
                var i, resultItems, currentFeature, previousFilterState;
                resultItems = this.resultsStore.query({});
                for (i = 0; i < resultItems.length; i++) {
                    currentFeature = resultItems[i];
                    currentFeature[this.COMMON_FIELDS.FILTERED_FIELD] = featureFilter.isFeatureFiltered(resultItems[i]);
                }
                this.onRefreshPreviewItems();
                this.resetQuery();
            },
            onRefreshPreviewItems: function () {

            },
            getCartItems: function () {
                if (!this.resultsStore) {
                    return {archive: []};
                }
                var i, currentFeature, archiveItems = [], results, queryParams = {};
                queryParams[this.COMMON_FIELDS.ADDED_TO_CART_FIELD] = true;
                results = this.resultsStore.query(queryParams);
                for (i = 0; i < results.length; i++) {
                    currentFeature = results[i];
                    archiveItems.push(currentFeature);
                }
                return {archive: archiveItems};
            },
            getPreviewFeatures: function () {
                if (this.resultsStore) {
                    var queryParams = {};
                    queryParams[this.COMMON_FIELDS.IS_PREVIEW_FIELD] = true;
                    return this.resultsStore.query(queryParams);
                }
                return [];
            },
            setInCartOnlyMode: function () {
                this.cartOnlyMode = true;
                this.showOnlyItemsInCart();
            },
            clearCartOnlyMode: function () {
                this.cartOnlyMode = false;
            },
            showOnlyItemsInCart: function () {
                if (this._resultsList) {
                    var resultQuery = {};
                    resultQuery[this.COMMON_FIELDS.ADDED_TO_CART_FIELD] = true;
                    this._resultsList.set("query", resultQuery);
                }
            },
            getUnfilteredResults: function () {
                if (this.resultsStore) {
                    var queryParams = {};
                    queryParams[this.COMMON_FIELDS.FILTERED_FIELD] = false;
                    return this.resultsStore.query(queryParams);
                }
                return [];

            },
            resetQuery: function () {
                this.clearTooltipCache();
                if (this._resultsList) {
                    var resultQuery = {};
                    resultQuery[this.COMMON_FIELDS.FILTERED_FIELD] = false;
                    this._resultsList.set("query", resultQuery);
                }
            },
            removeAllItemsFromCart: function () {
                if (!this.resultsStore) {
                    return;
                }
                var i, inCartQuery = {}, results, currentResult, currentRow, cartLblQueryArr;
                inCartQuery[this.COMMON_FIELDS.ADDED_TO_CART_FIELD] = true;
                results = this.resultsStore.query(inCartQuery);
                for (i = 0; i < results.length; i++) {
                    currentResult = results[i];
                    currentResult[this.COMMON_FIELDS.ADDED_TO_CART_FIELD] = false;
                    currentRow = this._resultsList.row(results[i]);
                    if (currentRow && currentRow.element) {
                        cartLblQueryArr = query(".addToCartLabel", currentRow.element);
                        if (cartLblQueryArr.length > 0) {
                            domAttr.set(cartLblQueryArr[0], "innerHTML", this.nls.addToCart);
                        }
                    }
                }
            },
            _toggleAddItemToCart: function (feature, cartLabel, cartButtonContainer) {
                if (feature[this.COMMON_FIELDS.ADDED_TO_CART_FIELD]) {
                    this._setFeatureRemovedFromCart(feature, cartLabel, cartButtonContainer, true);
                }
                else {

                    this._setFeatureAddedToCart(feature, cartLabel, cartButtonContainer, true);
                }
            },
            _handleRemoveFromCartRequest: function (feature) {
                var cartButtonAndLabel = this.getCartButtonAndLabelForFeature(feature);
                var label = cartButtonAndLabel ? cartButtonAndLabel.label : null;
                var container = cartButtonAndLabel ? cartButtonAndLabel.container : null;
                this._setFeatureRemovedFromCart(feature, label, container, true);

            },
            _handleAddToCartRequest: function (feature) {
                var cartButtonAndLabel = this.getCartButtonAndLabelForFeature(feature);
                this._setFeatureAddedToCart(feature, cartButtonAndLabel.label, cartButtonAndLabel.container, true);
            },
            _setFeatureAddedToCart: function (feature, cartLabelElement, cartButtonContainer, fireEvent) {
                if (!feature) {
                    return;
                }
                feature[this.COMMON_FIELDS.ADDED_TO_CART_FIELD] = true;

                if (cartButtonContainer && !domClass.contains(cartButtonContainer, "active")) {
                    domClass.add(cartButtonContainer, "active");
                }

                if (cartLabelElement) {
                    domAttr.set(cartLabelElement, "innerHTML", this.nls.remove);
                }
                if (this.cartOnlyMode) {
                    this.showOnlyItemsInCart();
                }
                if (fireEvent) {
                    this._onItemAddedToCart(feature);
                }
                this._onCartCountChanged();
            },
            _setFeatureRemovedFromCart: function (feature, cartLabelElement, cartButtonContainer, fireEvent) {
                if (!feature) {
                    return;
                }
                feature[this.COMMON_FIELDS.ADDED_TO_CART_FIELD] = false;
                if (cartButtonContainer && domClass.contains(cartButtonContainer, "active")) {
                    domClass.remove(cartButtonContainer, "active");
                }
                if (cartLabelElement) {
                    domAttr.set(cartLabelElement, "innerHTML", this.nls.addToCart);
                }
                if (fireEvent) {
                    this._onItemRemovedFromCart(feature);
                }
                if (this.cartOnlyMode) {
                    var removeCartRow, removeCartItem;
                    removeCartItem = this.getListItemForFeature(feature);
                    if (removeCartItem) {
                        removeCartRow = this.getRowForListItem(removeCartItem);
                        if (removeCartRow && removeCartRow.element) {
                            domConstruct.destroy(removeCartRow.element);
                        }
                    }
                }
                this._onCartCountChanged();
            },
            _onRefreshResults: function () {
                this.onRefreshResults();
            },
            onRefreshResults: function () {

            },

            clearList: function () {
                this.closeCurrentResultPopup();
                this.clearTooltipCache();
                if (this._resultsList) {
                    var memoryParameters;
                    memoryParameters = {data: [], idProperty: this.COMMON_FIELDS.RESULT_ID_FIELD};
                    this.resultsStore = new Memory(memoryParameters);
                    this._resultsList.set('store', this.resultsStore);
                }
            },
            _onCartCountChanged: function () {
                this.onCartCountChanged(this.getCartItemCount());
            },
            onCartCountChanged: function (count) {

            },
            _onItemAddedToCart: function (feature) {
                this.onItemAddedToCart(feature);
            },
            _onItemRemovedFromCart: function (feature) {
                this.onItemRemovedFromCart(feature);
            },
            onItemAddedToCart: function (feature) {

            },
            onItemRemovedFromCart: function (feature) {

            },
            clearPreviews: function () {
                if (this._resultsList && this.resultsStore) {
                    var queryParams = {}, results, i, currentResult, currentRow, previewQueryElementResult, previewIconContainerArr;
                    queryParams[this.COMMON_FIELDS.IS_PREVIEW_FIELD] = true;
                    results = this.resultsStore.query(queryParams);
                    for (i = 0; i < results.length; i++) {
                        currentResult = results[i];
                        currentResult[this.COMMON_FIELDS.IS_PREVIEW_FIELD] = false;
                        currentRow = this._resultsList.row(currentResult);
                        if (currentRow && currentRow.element) {
                            previewIconContainerArr = query("." + this.baseResultEntryName + "PreviewContainer", currentRow.element);
                            if (previewIconContainerArr && previewIconContainerArr.length > 0) {
                                domClass.remove(previewIconContainerArr[0], "active");
                                previewQueryElementResult = query(".fa-spin", previewIconContainerArr[0]);
                                if (previewQueryElementResult && previewQueryElementResult.length > 0) {
                                    domClass.remove(previewQueryElementResult[0], "fa-spin fa-spinner");
                                }
                            }
                        }
                    }
                }
            },
            getCartButtonAndLabelForFeature: function (feature) {
                var listItem, row, cartLabelArr, cartContainerArr;
                listItem = this.getListItemForFeature(feature);
                if (listItem) {
                    row = this.getRowForListItem(listItem);
                    if (row && row.element) {
                        cartContainerArr = query("." + this.baseResultEntryName + "AddToCartContainer", row.element);
                        if (cartContainerArr && cartContainerArr.length) {
                            cartLabelArr = query(".addToCartLabel", cartContainerArr[0]);
                            if (cartLabelArr && cartLabelArr.length > 0) {
                                return {label: cartLabelArr[0], container: cartContainerArr[0]}
                            }
                        }
                    }
                }
                return null;
            },

            getResultById: function (resultId) {
                if (this.resultsStore) {
                    return this.resultsStore.get(resultId);
                }
                return null;
            },
            getListItemForFeature: function (feature) {
                if (this.resultsStore) {
                    return this.resultsStore.get(feature[this.COMMON_FIELDS.RESULT_ID_FIELD]);
                }
                return null;
            },
            getRowForListItem: function (listItem) {
                if (this._resultsList) {
                    return this._resultsList.row(listItem);
                }
                return null;
            },
            _handleRemovePreviewRequest: function (feature) {
                var listItem, row, previewArr, previewIconContainerArr;
                listItem = this.getListItemForFeature(feature);
                if (listItem) {
                    row = this.getRowForListItem(listItem);
                    if (row && row.element) {
                        previewIconContainerArr = query("." + this.baseResultEntryName + "PreviewContainer", row.element);
                        if (previewIconContainerArr && previewIconContainerArr.length > 0) {
                            previewArr = query("." + this.baseResultEntryName + "PreviewIcon", previewIconContainerArr[0]);
                            if (previewArr.length > 0 && domClass.contains(previewIconContainerArr[0], "active")) {
                                this._togglePreviewItem(feature, previewArr[0], previewIconContainerArr[0]);
                            }
                        }
                    }
                    else {
                        this._togglePreviewItem(feature, null);
                    }
                }
                else {
                    this._togglePreviewItem(feature, null);
                }
            }
        });
    });
