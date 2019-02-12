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
    "dijit/ProgressBar",
    "dijit/form/NumberTextBox",
    "dijit/form/Select",
    "dijit/_WidgetsInTemplateMixin",
    "esri/toolbars/draw"
],
    function (declare, domClass, domAttr, ProgressBar, NumberTextBox, Select, _WidgetsInTemplateMixin, Draw) {
        return declare([ _WidgetsInTemplateMixin], {
            onMaximize: function () {
                this.inherited(arguments);
                this.showView();
            },
            onMinimize: function () {
                this.inherited(arguments);
                this.hideView();
            },
            onOpen: function () {
                this.inherited(arguments);
                this.showView();
            },
            onClose: function () {
                this.inherited(arguments);
                if (this.resultsWidget) {
                    if (this.resultsWidget.resultList) {
                        this.resultsWidget.resultList.closeCurrentResultPopup();
                    }
                }
                this.hideView();
            },
            discoveryTools: {
                currentExtent: true,
                point: true,
                rectangle: true,
                coordinates: true
            },
            setVisibleDiscoveryTools: function () {
                if (!this.discoveryTools.currentExtent) {
                    this._hideNode(this.currentExtentIcon);
                }
                if (!this.discoveryTools.point) {
                    this._hideNode(this.searchByPointIcon);
                }
                if (!this.discoveryTools.rectangle) {
                    this._hideNode(this.searchByRectangleIcon);
                }
                if (!this.discoveryTools.coordinates) {
                    this._hideNode(this.searchByBoundsIcon);
                }
                if (this.discoveryTools.pointToRectangle) {
                    this._hideNode(this.discoverySearchToolsHeader);
                }
                else {
                    this._hideNode(this.pointToRectangleIcon);
                }
            },
            checkoutClickDisabled: false,
            handleUserClearSearchArea: function () {
                this.clearSearchViews();
            },
            initProgressBar: function () {
                if (!this.progressBar) {
                    this.progressBar = new ProgressBar({
                        indeterminate: true
                    }, this.progressBarNode);
                    this.hideProgressBar();
                }
            },
            showProgressBar: function () {
                this._showNode(this.progressBar.domNode);

            },
            showIconSearchFilter: function () {
                if (this.iconSearchFilterContainer) {
                    this._showNode(this.iconSearchFilterContainer);
                }
            },
            hideIconSearchFilter: function () {
                if (this.iconSearchFilterContainer) {
                    this._hideNode(this.iconSearchFilterContainer);
                }
            },
            showSearchFilter: function () {
                this._showNode(this.searchFilterContainer);
            },
            hideSearchFilter: function () {
                this._hideNode(this.searchFilterContainer);
            },
            hideSearchSourcesWidget: function () {
                this._hideNode(this.searchSourcesOuterContainer);
            },
            showSearchSourcesWidget: function () {
                if (!this.searchServicesCheckboxViewDisabled) {
                    this._showNode(this.searchSourcesOuterContainer);
                }
            },
            hideProgressBar: function () {
                this._hideNode(this.progressBar.domNode);
            },

            hideClearButton: function () {
                this._hideNode(this.clearResultsIcon);
            },
            showClearButton: function () {
                this._showNode(this.clearResultsIcon);
            },
            hidePreSearchText: function () {
                this._hideNode(this.imageDiscoveryBeforeSearchInfoContainer);
            },
            showPreSearchText: function () {
                this._showNode(this.imageDiscoveryBeforeSearchInfoContainer);
                this.hideDuringSearchText();
            },
            hideDuringSearchText: function () {
                this._hideNode(this.imageDiscoveryDuringSearchInfoContainer);
            },
            showDuringSearchText: function () {
                this._showNode(this.imageDiscoveryDuringSearchInfoContainer);
                this.hidePreSearchText();
            },
            hideResultsContainer: function () {
                this._hideNode(this.resultsWidgetContainer);
            },
            showResultsContainer: function () {
                this._showNode(this.resultsWidgetContainer);
            },
            showSearchActionsContainer: function () {
                this._showNode(this.imageDiscoveryActionsContainer);
            },
            hideSearchActionsContainer: function () {
                if (this.drawManager) {
                    this.drawManager.deactivateTaskingDraw();
                }
                this._hideNode(this.imageDiscoveryActionsContainer);
            },
            hideReviewAndSubmitButton: function () {
                this._hideNode(this.checkoutButton);
            },
            showReviewAndSubmitButton: function () {
                this._showNode(this.checkoutButton);
            },
            updateOrderItemsCount: function (count) {
                domAttr.set(this.orderItemsCountElement, "innerHTML", count.toString());
            },
            isBoundsSearchVisible: function () {
                return !domClass.contains(this.discoveryActionSearchByBoundsInputs, "hidden");
            },

            togglePointToRectangleView: function () {
                if (domClass.contains(this.pointToRectangleIcon, "active")) {
                    this.deactivatePointToRectangleView();
                }
                else {
                    this.activatePointToRectangleView();
                }
            },
            deactivatePointToRectangleView: function () {
                this.deactivateDraw();
                domClass.remove(this.pointToRectangleIcon, "active");
            },
            activatePointToRectangleView: function () {
                this.clearSearchViews();
                domClass.add(this.pointToRectangleIcon, "active");
                this.drawManager.activatePointToRectangleDraw();
            },
            toggleBoundsSearchView: function () {
                if (domClass.contains(this.searchByBoundsIcon, "byBoundsUnselected")) {
                    this.activateBoundsSearchView();
                }
                else {
                    this.deactivateBoundsSearchView();
                }
            },
            activateBoundsSearchView: function () {
                this.clearSearchViews();
                domClass.remove(this.searchByBoundsIcon, "byBoundsUnselected");
                domClass.add(this.searchByBoundsIcon, "byBoundsSelected");
                domClass.remove(this.discoveryActionSearchByBoundsInputs, "hidden");
            },
            deactivateBoundsSearchView: function () {
                domClass.add(this.searchByBoundsIcon, "byBoundsUnselected");
                domClass.remove(this.searchByBoundsIcon, "byBoundsSelected");
                domClass.add(this.discoveryActionSearchByBoundsInputs, "hidden");
                this.disableSearchButton();
            },
            toggleExtentSearchView: function () {
                this.activateExtentSearchView();
            },
            activateExtentSearchView: function () {
                this.handleUserClearSearchArea();
                var graphic = this.drawManager.getGeometryGraphic(this.map.extent);
                this.drawManager.setMapGraphic(graphic);
                this._performSearch();
            },
            deactivateExtentSearchView: function () {
                this.deactivateDraw();
            },
            togglePointSearchView: function () {
                if (domClass.contains(this.searchByPointIcon, "byPointSelected")) {
                    this.deactivatePointSearchView();
                }
                else {
                    this.activatePointSearchView();
                }
            },
            activatePointSearchView: function () {
                this.clearSearchViews();
                this.activateDraw(Draw.POINT);
                domClass.remove(this.searchByPointIcon, "byPointUnselected");
                domClass.add(this.searchByPointIcon, "byPointSelected");
                domClass.remove(this.discoveryActionSearchByPointInputs, "hidden");
            },
            deactivatePointSearchView: function () {
                this.deactivateDraw();
                domClass.add(this.searchByPointIcon, "byPointUnselected");
                domClass.remove(this.searchByPointIcon, "byPointSelected");
                domClass.add(this.discoveryActionSearchByPointInputs, "hidden");
                this.pointDrawBufferValue.set("value", "");
            },
            toggleRectangleSearchView: function () {
                if (domClass.contains(this.searchByRectangleIcon, "byRectangleSelected")) {
                    this.deactivateRectangleSearchView();
                }
                else {
                    this.activateRectangleSearchView();
                }
            },
            activateRectangleSearchView: function () {
                this.clearSearchViews();
                this.activateDraw(Draw.EXTENT);
                domClass.remove(this.searchByRectangleIcon, "byRectangleUnselected");
                domClass.add(this.searchByRectangleIcon, "byRectangleSelected");
            },
            deactivateRectangleSearchView: function () {
                this.deactivateDraw();
                domClass.add(this.searchByRectangleIcon, "byRectangleUnselected");
                domClass.remove(this.searchByRectangleIcon, "byRectangleSelected");
            },
            clearSearchViews: function () {
                this.deactivateBoundsSearchView();
                this.deactivateRectangleSearchView();
                this.deactivatePointSearchView();
                this.deactivateExtentSearchView();
                this.deactivatePointToRectangleView();
                this.deactivateDraw();
            },
            disableSearchServicesCheckboxesView: function () {
                for (var i = 0; i < this.config.searchServices.length; i++) {
                    this.config.searchServices[i].enabledOnLoad = true;
                }
                this.hideSearchSourcesWidget();
                this.searchServicesCheckboxViewDisabled = true;
            },
            enableSearchButton: function () {
                this._showNode(this.findButton);
            },
            disableSearchButton: function () {
                this._hideNode(this.findButton);
            },
            setShoppingCartLabel: function (label) {
                domAttr.set(this.checkoutButton, "innerHTML", label);
            }
        });
    });