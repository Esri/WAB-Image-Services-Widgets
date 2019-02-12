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
        "dojo/text!./template/SearchByBoundsTemplate.html",
        "dojo/topic",
        "dojo/_base/lang",
        "dijit/_WidgetBase",
        "dijit/_TemplatedMixin",
        'dijit/_WidgetsInTemplateMixin',
        "./base/SearchByDecimalDegreesWidget",
        "./base/SearchByDMSWidget",
        "./base/SearchByUTMWidget",
        "dijit/form/RadioButton",
        "dijit/form/Button" ,
        "dojo/dom-class",
        "dojo/Deferred",
        'esri/config',
        "esri/tasks/ProjectParameters",
        "esri/SpatialReference"
    ],
    /**
     *    this widget is contained in the discovery widget. allows the user to search by coordinates in the discovery widget
     */
        function (declare, template, topic, lang, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, SearchByDecimalDegreesWidget, SearchByDMSWidget, SearchByUTMWidget, RadioButton, Button, domClass, Deferred, esriConfig, ProjectParameters, SpatialReference) {
        return declare(
            [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin],
            {

                map: null,
                utmSearchConfiguration: null,
                templateString: template,
                views: {
                    decimalDegree: "decimalDegree",
                    degreeMinuteSeconds: "degreeMinuteSeconds",
                    utm: "utm"
                },
                constructor: function (params) {
                    lang.mixin(this, params || {});
                },
                postCreate: function () {
                    this.disableSearchButton();
                    //set the default selected widget
                    this.currentVisibleWidget = this.searchByBoundsDecimalDegreeWidget;
                    this.createSearchByWidgets();
                    this.currentView = this.views.decimalDegree;

                    this.hideOtherViews(this.currentView);
                },
                setView: function (type) {
                    if (this.currentView != type) {
                        this.currentView = type;
                        this.handleViewChanged(type);
                    }
                },
                utmClick: function () {
                    this.setView(this.views.utm);
                },
                decimalDegreeClick: function () {
                    this.setView(this.views.decimalDegree);
                },
                dmsClick: function () {
                    this.setView(this.views.degreeMinuteSeconds);
                },
                /**
                 * figure out the view and set the current visible widget
                 * @param view
                 */
                handleViewChanged: function (view) {
                    if (view == this.views.decimalDegree) {
                        this.currentVisibleWidget = this.searchByBoundsDecimalDegreeWidget;
                    }
                    else if (view == this.views.degreeMinuteSeconds) {
                        this.currentVisibleWidget = this.searchByBoundsDMSWidget;
                    }
                    else if (view == this.views.utm) {
                        this.currentVisibleWidget = this.searchByBoundsUTMWidget;
                    }
                    else {
                        this.currentVisibleWidget = null;
                    }
                    this.hideOtherViews(view);
                    this.checkSubmitButtonEnabled();
                },
                hideOtherViews: function (view) {
                    if (view !== this.views.decimalDegree) {
                        this._hideNode(this.decimalDegreesWidgetContainer);
                    }
                    else {
                        this._showNode(this.decimalDegreesWidgetContainer);
                    }
                    if (view !== this.views.degreeMinuteSeconds) {
                        this._hideNode(this.dmsWidgetContainer);
                    }
                    else {
                        this._showNode(this.dmsWidgetContainer);
                    }
                    if (view !== this.views.utm) {
                        this._hideNode(this.utmWidgetContainer);
                    }
                    else {
                        this._showNode(this.utmWidgetContainer);
                    }
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
                /**
                 * creates all of the search by widgets for the discovery widget
                 */
                createSearchByWidgets: function () {
                    var checkValidBoundsCallback = lang.hitch(this, this.handleCheckValidBoundsInput);

                    //decimal degree
                    this.searchByBoundsDecimalDegreeWidget = new SearchByDecimalDegreesWidget({nls: this.nls});
                    this.searchByBoundsDecimalDegreeWidget.on("valuesChanged", checkValidBoundsCallback);
                    this.searchByBoundsDecimalDegreeWidget.placeAt(this.decimalDegreesWidgetContainer);

                    //dms
                    this.searchByBoundsDMSWidget = new SearchByDMSWidget({nls: this.nls});
                    this.searchByBoundsDMSWidget.on("valuesChanged", checkValidBoundsCallback);
                    this.searchByBoundsDMSWidget.placeAt(this.dmsWidgetContainer);

                    //utm
                    var utmParams = {nls: this.nls};
                    if (this.utmSearchConfiguration && this.utmSearchConfiguration.utmLookupJsonUrl) {
                        utmParams.utmLookupJsonUrl = this.utmSearchConfiguration.utmLookupJsonUrl;
                    }
                    this.searchByBoundsUTMWidget = new SearchByUTMWidget(
                        utmParams
                    );
                    this.searchByBoundsUTMWidget.on("valuesChanged", checkValidBoundsCallback);
                    this.searchByBoundsUTMWidget.placeAt(this.utmWidgetContainer);
                },
                /**
                 * sets the search by bounds button to enabled/disabled
                 * @param valid  state to set the button
                 */
                handleCheckValidBoundsInput: function (valid) {
                    //sets the submit button to enabled/disabled based on valid inputs
                    if (valid) {
                        this.enableSearchButton()
                    }
                    else {
                        this.disableSearchButton();
                    }

                },
                /**
                 * sets the submit button to enabled/disabled if the current visible bounds widget has valid inputs
                 */
                checkSubmitButtonEnabled: function () {
                    if (this.currentVisibleWidget) {
                        if (this.currentVisibleWidget.isValid()) {
                            this.enableSearchButton();
                        }
                        else {
                            this.disableSearchButton();
                        }
                    }
                    else {
                        this.disableSearchButton();
                    }
                },
                /**
                 * enables the search by bounds button
                 */
                enableSearchButton: function () {
                    this.onEnableSearchButton();
                },
                onEnableSearchButton: function () {

                },
                /**
                 * disables the search by bounds button
                 */
                disableSearchButton: function () {
                    this.onDisableSearchButton();
                },
                onDisableSearchButton: function () {

                },
                /**
                 * using the geometry from the currently visible widgets a spatial search is requested
                 */
                getBoundsSearchGeometry: function () {
                    //get the geometry based on which search by bounds widget is in the current view
                    var def = new Deferred();
                    var searchGeometry;
                    if (this.searchByBoundsFormatDMSRadio.get("checked")) {
                        searchGeometry = this.searchByBoundsDMSWidget.getGeometry();
                    }
                    else if (this.searchByBoundsFormatUTMRadio.get("checked")) {
                        searchGeometry = this.searchByBoundsUTMWidget.getGeometry();
                    }
                    else {
                        searchGeometry = this.searchByBoundsDecimalDegreeWidget.getGeometry();
                    }
                    if (!searchGeometry) {
                        def.resolve(null);
                    }
                    if (esriConfig.defaults && esriConfig.defaults.geometryService) {
                        var params = new ProjectParameters();
                        params.geometries = [searchGeometry];
                        params.outSR = this.map.extent.spatialReference;
                        esriConfig.defaults.geometryService.project(params).then(lang.hitch(this, function (res) {
                            def.resolve(res[0]);
                        }));
                    }
                    else {
                        def.resolve(searchGeometry);
                    }
                    return def
                }

            });
    });