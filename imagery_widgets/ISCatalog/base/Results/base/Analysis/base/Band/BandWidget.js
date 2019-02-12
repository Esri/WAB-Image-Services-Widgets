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
        "dojo/text!./template/BandWidgetTemplate.html",
        "dojo/dom-class",
        "dojo/_base/array",
        "dojo/dom-attr",
        "dojo/_base/lang",
        "dojo/dom-construct",
        "../BaseAnalysisWidget",
        "dijit/form/Select"
    ],
    function (declare, template, domClass, array, domAttr, lang, domConstruct, BaseAnalysisWidget, Select) {

        return declare([BaseAnalysisWidget], {
            templateString: template,
            _bandOrderingSet: false,
            maxDisplayBandCount: 3,
            bandSelectWidth: "80%",
            constructor: function () {
                this.currentBandOrdering = [];
                this.bandSelects = [];
                this.bandChangeListeners = [];
            },
            clear: function (reloadLayer) {
                this._bandOrderingSet = false;
                this._hideNode(this.bandReorderClearButton);
                this.inherited(arguments);
                var i;
                for (i = 0; i < this.bandSelects.length; i++) {
                    this.bandSelects[i].destroy();
                }
                domConstruct.empty(this.bandSelectsContainer);
                this.currentBandOrdering = [];
                for (i = 0; i < this.bandChangeListeners.length; i++) {
                    this.bandChangeListeners[i].remove();
                }
                this.bandChangeListeners = [];
                this.bandSelects = [];
            },
            reload: function () {
                this.clear(false);
                if (!this.currentLayer || !this.currentLayer.bandCount || this.currentLayer.bandCount === 1) {
                    this.hide();
                }
                else {
                    this.show();
                    this.createBandSelects();

                }
            },
            createBandSelects: function () {
                //todo: need to set the selects to the current band ordering
                var i, bandEntry , bandEntryLbl, bandLbl, bandLoopCount, existingBandValue, currentBandValue, currentBandOption;
                if (this.currentLayer && this.currentLayer.bandCount > 1) {
                    bandLoopCount = this.currentLayer.bandCount > this.maxDisplayBandCount ? this.maxDisplayBandCount : this.currentLayer.bandCount;
                    for (i = 0; i < bandLoopCount; i++) {
                        bandEntry = domConstruct.create("div", {className: "bandReorderEntry"});
                        bandEntryLbl = domConstruct.create("span", {innerHTML: (i + 1), className: "bandReorderBandIndexLbl"});
                        domConstruct.place(bandEntryLbl, bandEntry);
                        domConstruct.place(bandEntry, this.bandSelectsContainer);
                        var bandSelect = new Select({style: {width: this.bandSelectWidth}});
                        bandSelect.placeAt(bandEntry);
                        this.bandSelects.push(bandSelect);
                        for (var j = 0; j < this.currentLayer.bandCount; j++) {
                            bandLbl = "";
                            //todo: look for labels
                            bandLbl = j + 1;
                            currentBandValue = "" + j;
                            currentBandOption = {label: bandLbl + "", value: currentBandValue};
                            bandSelect.addOption(currentBandOption);
                        }
                        if (this.currentLayer.bandIds && this.currentLayer.bandIds.length > 0) {
                            existingBandValue = this.currentLayer.bandIds[i];
                            if (existingBandValue || existingBandValue === 0) {
                                bandSelect.set("value", ("" + existingBandValue));
                            }
                        }
                        else {
                            bandSelect.set("value", (i + ""));
                        }
                        this.bandChangeListeners.push(bandSelect.on("change", lang.hitch(this, this.handleBandSelectChange, bandSelect)));
                    }
                }
                if (this.currentLayer.bandIds && this.currentLayer.bandIds.length > 0) {
                    this._bandOrderingSet = true;
                    this._showNode(this.bandReorderClearButton);
                }
            },
            handleBandSelectChange: function (bandSelect, value) {
                //find the dupe
                var selectedBands = {};
                var currentBandSelect;
                var currBandValue;
                var currentBandOptionValue;
                var i;
                for (i = 0; i < this.bandSelects.length; i++) {
                    selectedBands[this.bandSelects[i].get("value")] = "selected";
                }
                for (i = 0; i < this.bandSelects.length; i++) {
                    currentBandSelect = this.bandSelects[i];
                    if (currentBandSelect != bandSelect) {
                        currBandValue = currentBandSelect.get("value");
                        if (currBandValue === value) {
                            //find the unused band
                            for (var j = 0; j < currentBandSelect.options.length; j++) {
                                currentBandOptionValue = currentBandSelect.options[j].value;
                                if (!selectedBands[currentBandOptionValue]) {
                                    currentBandSelect.set("value", currentBandOptionValue);
                                    return;
                                }
                            }
                        }
                    }
                }
            },
            resetBandOrdering: function () {
                //see if the bands are already in order
                var bandsInOrder = true, i;
                for (i = 0; i < this.bandSelects.length; i++) {
                    if (i != this.bandSelects[i].get("value")) {
                        bandsInOrder = false;
                    }
                }
                if (!bandsInOrder) {
                    if (this.bandSelects && lang.isArray(this.bandSelects) && this.bandSelects.length > 0) {
                        for (i = 0; i < this.bandSelects.length; i++) {
                            this.bandSelects[i].set("value", ("" + i));
                        }
                        this.applyBandReorder();
                    }
                }
            },
            applyBandReorder: function () {
                //two events are fired for each change. one for checked and unchecked. we only want to listen on one
                var i, selectedBandIndexes = [], currentBandSelect, bandSelectValue, currentRadio, selectedBands = [], currBandId, hasChange = false;
                for (i = 0; i < this.bandSelects.length; i++) {
                    currentBandSelect = this.bandSelects[i];
                    bandSelectValue = parseInt(currentBandSelect.get("value"), 10);
                    selectedBandIndexes.push(bandSelectValue);
                }
                //see if there are dupe bands in the selected array
                for (i = 0; i < selectedBandIndexes.length; i++) {
                    currBandId = selectedBandIndexes[i];
                    if (array.indexOf(selectedBands, currBandId) > -1) {
                        //there are dupes in the band ordering
                        return;
                    }
                    else {
                        selectedBands.push(currBandId);
                    }
                }
                //see if there is a change to the band ordering
                if (this.currentBandOrdering.length == selectedBandIndexes.length) {
                    for (i = 0; i < this.currentBandOrdering.length; i++) {
                        if (this.currentBandOrdering[i] != selectedBandIndexes[i]) {
                            hasChange = true;
                            break;
                        }
                    }
                }
                else {
                    hasChange = true;
                }
                if (hasChange) {
                    this.currentBandOrdering = selectedBandIndexes;
                    this.onBeforeBandReorder();
                    //TODO: reorder on the layer this.queryLayerController.reorderBands(this.currentBandOrdering);
                    if (this.currentBandOrdering == null || !lang.isArray(this.currentBandOrdering)) {
                        this.currentBandOrdering = [];
                    }
                    this.currentLayer.setBandIds(this.currentBandOrdering);
                    this._bandOrderingSet = true;
                    this._showNode(this.bandReorderClearButton);
                    this.onBandsReordered();
                }
            },
            setDefaultBandOrdering: function () {
                this._bandOrderingSet = false;
                if (this.currentLayer) {
                    this.currentLayer.setBandIds([]);
                }
                this.reload();
            },
            onBeforeBandReorder: function () {

            },
            onBandsReordered: function () {

            },
            isSupportedLayer: function () {
                return this.currentLayer && this.currentLayer.bandCount && this.currentLayer.bandCount > 1;
            }
        });
    });