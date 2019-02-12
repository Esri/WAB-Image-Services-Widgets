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
        "dojo/text!./template/ReorderPreviewsTemplate.html",
        "dijit/_WidgetBase",
        "dojo/dom-construct",
        "dijit/_TemplatedMixin",
        "dijit/_WidgetsInTemplateMixin",
        "dojo/_base/lang",
        "dojo/dom-class",
        "dojo/dom-attr",
        "../../../BaseDiscoveryMixin",
        "dojo/dnd/Source",
        "dojo/on",
        "dojo/query"
    ],
    function (declare, template, _WidgetBase, domConstruct, _TemplatedMixin, _WidgetsInTemplateMixin, lang, domClass, domAttr, BaseDiscoveryMixin, Source, on, query) {
        return declare([_WidgetBase, _TemplatedMixin, BaseDiscoveryMixin, _WidgetsInTemplateMixin], {
            _blockExtentGeometry: false,
            entryClassName: "reorderPreview",
            widgetsInTemplate: true,
            templateString: template,
            archiveAddToCartDisabled: false,
            constructor: function(params){
                lang.mixin(this,params || {});
            },
            isVisible: function () {
                return !domClass.contains(this.domNode, "hidden");
            },
            clear: function () {
                this.archiveAddToCartDisabled = false;
                domConstruct.empty(this.reorderThumbnailContainer);
                this.hide();
            },
            toggle: function () {
                if (domClass.contains(this.domNode, "hidden")) {
                    this.show();
                }
                else {
                    this.hide();
                }
            },
            show: function () {
                this._showNode(this.domNode);
            },
            hide: function () {
                this._hideNode(this.domNode);
            },
            setPreviewFeatures: function (previewFeatures) {
                domConstruct.empty(this.reorderThumbnailContainer);
                if (this.thumbnailDndSource) {
                    this.thumbnailDndSource.destroy();
                }
                this.thumbnailDndSource = new Source(this.reorderThumbnailContainer, {creator: lang.hitch(this, this.renderThumbnail)});
                this.thumbnailDndSource.copyState = function () {
                    return false;
                };
                this.thumbnailDndSource.insertNodes(false, previewFeatures);
                this.thumbnailDndSource.on("DndDrop", lang.hitch(this, this.handleDrop));
                this.thumbnailDndSource.on("DndStart", lang.hitch(this, this.handleDndStart));
                this.thumbnailDndSource.on("DndCancel", lang.hitch(this, this.handleDndCancel));
            },
            handleDndStart: function () {
                this._blockExtentGeometry = true;
            },
            handleDndCancel: function () {
                this._blockExtentGeometry = false;
            },
            renderThumbnail: function (feature, hint) {
                var currentThumbSensorElement, currentThumbActionsElement, thumbnailImgOuterContainer, sensorLabel = feature[this.COMMON_FIELDS.SERVICE_LABEL] || "", currentThumbImg, currentThumbContainer, arrowsIcon, cartIcon, removeIcon;
                currentThumbContainer = domConstruct.create("div", { className: this.entryClassName + "ThumbContainer"});
                on(currentThumbContainer, "mouseover", lang.hitch(this, this._showExtentGeometry, feature));
                on(currentThumbContainer, "mouseout", lang.hitch(this, this._hideExtentGeometry, feature));
                removeIcon = domConstruct.create("i", {className: "fa fa-times removeIcon", title: this.nls.removePreview});
                cartIcon = domConstruct.create("i", {className: "fa fa-shopping-cart reorderCart"});
                on(removeIcon, "click", lang.hitch(this, this._onRemovePreview, feature));
                on(cartIcon, "click", lang.hitch(this, this.toggleItemInCart, feature, cartIcon));
                currentThumbActionsElement = domConstruct.create("div", {className: this.entryClassName + "ActionsContainer"});
                domConstruct.place(currentThumbActionsElement, currentThumbContainer);
                domConstruct.place(removeIcon, currentThumbContainer);
                domConstruct.place(cartIcon, currentThumbActionsElement);
                if (feature[this.COMMON_FIELDS.ADDED_TO_CART_FIELD]) {
                    this.setCartIconToRemove(cartIcon);
                }
                else {
                    this.setCartIconToAdd(cartIcon);
                    if (this.archiveAddToCartDisabled) {
                        this._hideNode(cartIcon);
                    }
                }
                thumbnailImgOuterContainer = domConstruct.create("div", { className: this.entryClassName + "ThumbOuter"});

                //todo: figure out sensor label
                currentThumbSensorElement = domConstruct.create("div", {className: this.entryClassName + "SensorLabel", innerHTML: sensorLabel});
                domConstruct.place(currentThumbSensorElement, thumbnailImgOuterContainer);

                domConstruct.place(thumbnailImgOuterContainer, currentThumbContainer);
                currentThumbImg = domConstruct.create("img", { className: this.entryClassName + "Thumb", src: feature[this.COMMON_FIELDS.THUMBNAIL_FIELD]});
                domConstruct.place(currentThumbImg, thumbnailImgOuterContainer);
                arrowsIcon = domConstruct.create("i", {className: "fa fa-arrows reorderArrow"});
                domConstruct.place(arrowsIcon, thumbnailImgOuterContainer);


                return {node: currentThumbContainer, data: feature, type: ["thumbnail"]};
            },
            _onRemovePreview: function (feature) {
                this.onRemovePreview(feature);
            },
            onRemovePreview: function (feature) {

            },
            toggleItemInCart: function (feature, cartIcon) {
                if (feature[this.COMMON_FIELDS.ADDED_TO_CART_FIELD]) {
                    this.handleRemoveItemFromCart(feature, cartIcon);
                }
                else {
                    this.handleAddItemToCart(feature, cartIcon);
                }
            },
            handleRemoveItemFromCart: function (feature, cartIcon) {
                this._onRemoveItemFromCart(feature);
            },
            handleAddItemToCart: function (feature, cartIcon) {
                this._onAddItemToCart(feature);
            },
            setCartIconToAdd: function (cartIcon) {
                if (domClass.contains(cartIcon, "remove")) {
                    domClass.remove(cartIcon, "remove");

                }
                if (!domClass.contains(cartIcon, "add")) {
                    domClass.add(cartIcon, "add");
                }
                domAttr.set(cartIcon, "title", this.nls.addToCart);
            },
            setCartIconToRemove: function (cartIcon) {
                if (!domClass.contains(cartIcon, "remove")) {
                    domClass.add(cartIcon, "remove");
                }
                if (domClass.contains(cartIcon, "add")) {
                    domClass.remove(cartIcon, "add");
                }
                domAttr.set(cartIcon, "title", this.nls.remove);
            },
            _onAddItemToCart: function (feature) {
                this.onAddItemToCart(feature);
            },
            onAddItemToCart: function (feature) {

            },
            _onRemoveItemFromCart: function (feature) {
                this.onRemoveItemFromCart(feature);
            },
            onRemoveItemFromCart: function (feature) {

            },
            handleDrop: function () {
                this._blockExtentGeometry = false;
                var source = this.thumbnailDndSource;
                var orderedDataItems = source.getAllNodes().map(function (node) {
                    return source.getItem(node.id).data;
                });
                this._onOrderChanged(orderedDataItems);
            },
            _onOrderChanged: function (orderedDataItems) {
                this.onOrderChanged(orderedDataItems);
            },
            onOrderChanged: function (orderedDataItems) {

            },
            showSpinner: function () {
                this._showNode(this.loadingSpinnerContainer);
            },
            hideSpinner: function () {
                this._hideNode(this.loadingSpinnerContainer);
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
            itemRemovedFromCart: function (feature) {
                if (!this.thumbnailDndSource) {
                    return;
                }
                var cartIcon = this.getCartIconForFeature(feature);
                if (!cartIcon) {
                    return;
                }
                this.setCartIconToAdd(cartIcon);

            },
            itemAddedToCart: function (feature) {
                if (!this.thumbnailDndSource) {
                    return;
                }
                var cartIcon = this.getCartIconForFeature(feature);

                if (!cartIcon) {
                    return;
                }
                this.setCartIconToRemove(cartIcon);
            },
            getCartIconForFeature: function (feature) {
                var i, source, nodes, currentNode, currentItem, cartNodes;
                source = this.thumbnailDndSource;
                nodes = source.getAllNodes();
                for (i = 0; i < nodes.length; i++) {
                    currentNode = nodes[i];
                    if (currentNode) {
                        currentItem = source.getItem(currentNode.id);
                        if (currentItem && currentItem.data) {
                            if (currentItem.data[this.COMMON_FIELDS.RESULT_ID_FIELD] === feature[this.COMMON_FIELDS.RESULT_ID_FIELD]) {
                                cartNodes = query(".reorderCart", currentNode);
                                if (cartNodes && cartNodes.length > 0) {
                                    return cartNodes[0];
                                }
                                return null;
                            }
                        }
                    }
                }
                return null;
            },
            hideAddToCartIcons: function () {
                var i, addToCartIcons = query(".add", this.reorderThumbnailContainer);
                for (i = 0; i < addToCartIcons.length; i++) {
                    this._hideNode(addToCartIcons[i]);
                }
                this.archiveAddToCartDisabled = true;
            },
            showAddToCartIcons: function () {
                var i, addToCartIcons = query(".add", this.reorderThumbnailContainer);
                for (i = 0; i < addToCartIcons.length; i++) {
                    this._showNode(addToCartIcons[i]);
                }
                this.archiveAddToCartDisabled = false;
            },
            _showExtentGeometry: function (feature) {
                if (!this._blockExtentGeometry) {
                    this.onShowExtentGeometry(feature);
                }
            },
            onShowExtentGeometry: function (feature) {

            },
            _hideExtentGeometry: function (feature) {
                if (!this._blockExtentGeometry) {
                    this.onHideExtentGeometry(feature);
                }
            },
            onHideExtentGeometry: function (feature) {

            }
        });
    })
;

