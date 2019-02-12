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
        'dojo/_base/declare',
        "dojo/text!./template/SearchFilterTemplate.html",
        "dijit/_WidgetBase",
        "dijit/_TemplatedMixin",
        "dojo/_base/lang",
        "dojo/dom-construct",
        "dijit/form/DateTextBox",
        "dojo/date/locale",
        "dijit/form/HorizontalSlider",
        "dojo/dom-attr",
        "dojo/dom-class"
    ],
    function (declare, template, _WidgetBase, _TemplatedMixin, lang, domConstruct, DateTextBox, locale, HorizontalSlider, domAttr, domClass) {
        return declare([_WidgetBase, _TemplatedMixin], {
            templateString: template,
            defaultCloudCover: 100,
            showCloudCover: true,
            showAcquisitionDate: true,
            apiDateFormat: "yyyy-MM-dd  hh:mm:ss",
            _fieldNameTemplateEntry: "${fieldName}",
            _valueTemplateEntry: "${value}",
            _nullValue: "_null_",
            constructor: function (params) {
                lang.mixin(this, params || {});
            },
            postCreate: function () {
                this.inherited(arguments);
                this.createCloudCoverSlider();
                this._createQueryFields();
                if (!this.showCloudCover) {
                    this.hideCloudCoverFilter();
                }
                if (!this.showAcquisitionDate) {
                    this.hideAcquisitionDateFilter();
                }
            },
            showCloudCoverFilter: function () {
                domClass.remove(this.cloudCoverFilterContainer, "hidden");
            },
            hideCloudCoverFilter: function () {
                domClass.add(this.cloudCoverFilterContainer, "hidden");
            },
            hideAcquisitionDateFilter: function () {
                domClass.add(this.acquisitionDateFilterContainer, "hidden");
            },
            showAcquisitionDateFilter: function () {
                domClass.remove(this.acquisitionDateFilterContainer, "hidden");
            },
            resetValues: function () {
                var currInput;
                //todo reset
            },
            _createQueryFields: function () {
                this.startDateFilter = this._createDateFilter({label: this.nls.startDate, iconClass: "fa fa-calendar"}, this.startDateContainer);
                this.endDateFilter = this._createDateFilter({label: this.nls.endDate, iconClass: "fa fa-calendar"}, this.endDateContainer);
            },
            _createDateFilter: function (currentQueryField, parentNode) {
                var container = domConstruct.create("div", {className: "searchFilter dateFilter"});
                var header = domConstruct.create("div", {className: "searchFilterLabel"});
                var headerLbl = domConstruct.create("span", { innerHTML: currentQueryField.label});

                if (currentQueryField.iconClass) {
                    var icon = domConstruct.create("i", {className: "icon " + currentQueryField.iconClass});
                    domConstruct.place(icon, header);
                }
                domConstruct.place(headerLbl, header);

                var dateTextBox = new DateTextBox({ style: {width: "90%" },
                    constraints: {datePattern: "MM-dd-yyyy"}
                });
                domConstruct.place(header, container);
                dateTextBox.placeAt(container);
                domConstruct.place(container, parentNode);
                return dateTextBox;
            },

            _formatDate: function (date) {
                return locale.format(date, {selector: "date", datePattern: this.apiDateFormat});
            },
            createCloudCoverSlider: function () {
                if (this.cloudCoverSlider) {
                    return;
                }
                this.cloudCoverSlider = new HorizontalSlider({
                    minimum: 0,
                    maximum: 100,
                    intermediateChanges: true,
                    value: this.defaultCloudCover,
                    discreteValues: 101,
                    pageIncrement: 1
                }, this.cloudCoverSliderContainer);
                this._cloudCoverFilterListener = this.cloudCoverSlider.on("change", lang.hitch(this, this.handleCloudCoverChange));
                this.handleCloudCoverChange(this.cloudCoverSlider.get("value"));
            },
            getStartDate: function () {
                var startDate;
                if (this.startDateFilter) {
                    startDate = this.startDateFilter.get("value");
                    if (startDate) {
                        return this._formatDate(startDate);
                    }
                }
                return null;
            },
            getEndDate: function () {
                var endDate;
                if (this.endDateFilter) {
                    endDate = this.endDateFilter.get("value");
                    if (endDate) {
                        return this._formatDate(endDate);
                    }
                    return this.endDateFilter.get("value");
                }
                return null;
            },
            getCloudCover: function () {
                if (this.cloudCoverSlider) {
                    return Math.floor(this.cloudCoverSlider.get("value"));
                }
                return null;

            },
            handleCloudCoverChange: function (value) {
                this.updateCloudCoverValue(this.getCloudCover());
            },
            updateCloudCoverValue: function (value) {
                domAttr.set(this.cloudCoverSliderValueContainer, "innerHTML", value.toString() + "%");
            }
        });
    });