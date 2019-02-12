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
        "dojo/dom-class" ,
        "../../BaseDiscoveryMixin"
    ],
    function (declare, domClass, BaseDiscoveryMixin) {
        return declare([ BaseDiscoveryMixin], {
            showNoResultsContainer: function () {
                this._showNode(this.noResultsEntriesContainer);
                this.hideResultsContainer();

            },
            hideNoResultsContainer: function () {
                this._hideNode(this.noResultsEntriesContainer);

            },
            showResultsContainer: function () {
                this._showNode(this.resultEntriesContainer);
                this.hideNoResultsContainer();

            },
            hideResultsContainer: function () {
                this._hideNode(this.resultEntriesContainer);

            },
            hideResultFilterIcon: function () {
                this._hideNode(this.toggleResultFilterIcon);
            },
            showResultFilterIcon: function () {
                this._showNode(this.toggleResultFilterIcon);
            },
            toggleReorderPreview: function () {
                if (!this.reorderPreviews) {
                    return;
                }
                if (this.reorderPreviews.isVisible()) {
                    this.hideReorderPreview();
                }
                else {
                    this.showReorderPreview();
                    this.hideSort();
                    this.hideResultFilter();
                    this.hideAnalysis();
                }
            },
            toggleFilterWidgetDisplay: function () {
                if (!this.resultFilter) {
                    return;
                }
                if (this.resultFilter.isVisible()) {
                    this.hideResultFilter();
                }
                else {
                    this.showResultFilter();
                    this.hideSort();
                    this.hideReorderPreview();
                    this.hideAnalysis();
                }
            },
            toggleAnalysisPopup: function () {
                if (!this.analysisWidget) {
                    return;
                }
                if (this.analysisWidget.isVisible()) {
                    this.hideAnalysis();

                }
                else {
                    this.showAnalysis();
                    this.hideResultFilter();
                    this.hideReorderPreview();
                    this.hideSort()
                }
            },
            hideAnalysis: function () {
                if (this.analysisWidget && this.analysisWidget.isVisible()) {
                    this.analysisWidget.hide();

                }
                this._deactivateButton(this.analysisIcon);
            },
            showAnalysis: function () {
                if (this.analysisWidget && !this.analysisWidget.isVisible()) {
                    this.analysisWidget.show();
                    this._activeButton(this.analysisIcon);
                }

            },
            toggleSortPopup: function () {
                if (!this.resultSort) {
                    return;
                }
                if (this.resultSort.isVisible()) {
                    this.hideSort();

                }
                else {
                    this.showSort();
                    this.hideResultFilter();
                    this.hideReorderPreview();
                    this.hideAnalysis();
                }
            },
            hide: function () {
                this.hideResultFilter();
                this.hideAnalysis();
                this.hideSort();
                if (this.archiveImageServiceLayerSupport) {
                    this.archiveImageServiceLayerSupport.hide();
                }
                this.hideDetailsWidget();
                this.hideReorderPreview();
            },
            hideReorderPreview: function () {
                if (this.reorderPreviews && this.reorderPreviews.isVisible()) {
                    this.reorderPreviews.hide();

                }
                this._deactivateButton(this.reorderPreviewsIcon);

            },
            showReorderPreview: function () {
                if (this.reorderPreviews && !this.reorderPreviews.isVisible()) {
                    this.reorderPreviews.setPreviewFeatures(this.getPreviewFeatures());
                    this.reorderPreviews.show();
                    this._activeButton(this.reorderPreviewsIcon);
                }
            },
            hideSortButton: function () {
                if (!domClass.contains(this.toggleResultSortIcon, "hidden")) {
                    domClass.add(this.toggleResultSortIcon, "hidden");

                }

            },
            showSortButton: function () {
                if (domClass.contains(this.toggleResultSortIcon, "hidden")) {
                    domClass.remove(this.toggleResultSortIcon, "hidden");

                }
            },
            hideSort: function () {
                if (this.resultSort && this.resultSort.isVisible()) {
                    this.resultSort.hide();

                }
                this._deactivateButton(this.toggleResultSortIcon);
            },
            showSort: function () {
                if (!domClass.contains(this.toggleResultSortIcon,"hidden")) {
                    if (this.resultSort && !this.resultSort.isVisible()) {
                        this.resultSort.show();
                        this._activeButton(this.toggleResultSortIcon);
                    }
                }
            },
            hideResultFilterButton: function () {
                this._hideNode(this.toggleResultFilterIcon);
            },
            showResultFilterButton: function () {
                if (this.createResultFilter) {
                    this._showNode(this.toggleResultFilterIcon);
                }
            },
            hideResultFilter: function () {
                if (this.resultFilter && this.resultFilter.isVisible()) {
                    this.resultFilter.hide();

                }
                this._deactivateButton(this.toggleResultFilterIcon);

            },
            showResultFilter: function () {
                if (this.resultFilter && !this.resultFilter.isVisible()) {
                    this.resultFilter.show();

                }
                this._activeButton(this.toggleResultFilterIcon);

            },
            showClearPreviewsContainer: function () {
                this._showNode(this.clearPreviewsContainer);
                this._showNode(this.clearPreviewsContainer);
            },
            hideClearPreviewsContainer: function () {
                this._hideNode(this.clearPreviewsContainer);

            },

            show: function () {
                if (this.archiveImageServiceLayerSupport) {
                    this.archiveImageServiceLayerSupport.show();
                }
            },
            hideDetailsWidget: function () {
                if (this.detailsWidget) {
                    this.detailsWidget.hide();
                }
            },
            isReorderPreviewButtonHidden: function () {
                return domClass.contains(this.reorderPreviewsIcon, "hidden");
            },
            hideReorderPreviewButton: function () {
                this._hideNode(this.reorderPreviewsIcon);
            },
            showReorderPreviewButton: function () {
                this._showNode(this.reorderPreviewsIcon);
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
            _activeButton: function (node) {
                if (!domClass.contains(node, "active")) {
                    domClass.add(node, "active");
                }
            },
            _deactivateButton: function (node) {
                if (domClass.contains(node, "active")) {
                    domClass.remove(node, "active");
                }
            },
            isButtonActive: function (node) {
                return domClass.contains(node, "active");
            },
            hideCartIcon: function () {
                this._hideNode(this.toggleCartItemsIcon);
                if (this.isCartOnlyMode()) {
                    this.clearCartOnlyFilter();
                }
            },
            showCartIcon: function () {
                this._showNode(this.toggleCartItemsIcon);
            },
            zoomToSearchArea: function () {
                this.emit(this.ZOOM_TO_SEARCH_EXTENT);
            }
        });
    });