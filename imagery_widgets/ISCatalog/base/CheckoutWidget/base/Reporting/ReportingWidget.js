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

//TODO: this can be cleaned up a lot by using common methods that retrieve data over all report modes

define([
        "dojo/_base/declare",
        "dojo/date/locale",
        "dojo/topic",
        "dojo/_base/array",
        "dojo/_base/lang",
        "dojo/_base/Color",
        "dojo/text!./template/ReportingTemplate.html",
        "dijit/_WidgetBase",
        "dijit/_TemplatedMixin",
        'dijit/_WidgetsInTemplateMixin',
        "dijit/form/Button",
        "esri/symbols/SimpleFillSymbol",
        "esri/symbols/SimpleLineSymbol" ,
        "esri/tasks/QueryTask",
        "esri/tasks/query",
        "esri/tasks/PrintTemplate",
        "esri/tasks/PrintParameters",
        "esri/tasks/PrintTask",
        "dojo/dom-class"
    ],
    function (declare, locale, topic, array, lang, Color, template, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Button, SimpleFillSymbol, SimpleLineSymbol, QueryTask, Query, PrintTemplate, PrintParameters, PrintTask, domClass) {
        return declare(
            [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin],
            {
                map: null,
                PDF: "PDF",
                HTML: "HTML",
                __defaultDisplayFormats: {
                    date: "MM/dd/yyyy"
                },
                displayFormats: {
                    date: "MM/dd/yyyy"
                },
                __defaultExportImageHeight: 800,
                __defaultExportImageWidth: 600,
                templateString: template,
                envelopeSymbol: new SimpleFillSymbol(SimpleFillSymbol.STYLE_NULL,
                    new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                        new Color([0, 128, 0]), 1),
                    new Color([255, 0, 0, .5])),
                constructor: function (params) {
                    lang.mixin(this, params || {});
                    this.serviceQueryResponses = [];
                },
                postCreate: function () {
                    this.inherited(arguments);
                    if (this.resultFields) {
                        this.resultFieldsLabelLookup = {};
                        this.resultFieldsArray = [];
                        if (this.resultFields != null && lang.isArray(this.resultFields)) {
                            for (var i = 0; i < this.resultFields.length; i++) {
                                this.resultFieldsArray.push({field: this.resultFields[i].field, label: this.resultFields[i].label });
                                this.resultFieldsLabelLookup[this.resultFields[i].field] = this.resultFields[i].label;
                            }
                        }
                    }
                    this.reportTypeSelect.on("change", lang.hitch(this, this.handleReportTypeChange));
                },
                handleReportTypeChange: function (value) {
                    if (value === this.PDF) {
                        domClass.remove(this.pdfContainer, "hidden");
                        domClass.add(this.htmlContainer, "hidden");
                    }
                    else {
                        domClass.add(this.pdfContainer, "hidden");
                        domClass.remove(this.htmlContainer, "hidden");
                    }
                },
                handleGenerateReport: function () {
                    this._generateReport();
                },
                /**
                 * kicks of the report generation
                 * @private
                 */
                _generateReport: function () {
                    var selectedFormat = this.reportTypeSelect.get("value");
                    if (selectedFormat === this.HTML) {
                        this._generateHTMLReport();
                    }
                    else {
                        this._generatePDFReport();
                    }
                },
                _getCurrentBasemapUrl: function () {
                    var currentBaseMap;
                    topic.publish(VIEWER_GLOBALS.EVENTS.MAP.BASEMAP.GET_CURRENT_URL, function (curr) {
                        currentBaseMap = curr;
                    });
                    if (currentBaseMap == null) {
                        topic.publish(VIEWER_GLOBALS.EVENTS.MESSAGING.SHOW, this.nls.couldNotRetrieveCurrentBasemap);
                        VIEWER_UTILS.log(this.nls.couldNotGenerateReport + ". " + this.nls.couldNotRetrieveCurrentBasemap + ".", VIEWER_GLOBALS.LOG_TYPE.ERROR);
                        return null;
                    }
                    return currentBaseMap;
                },
                _generatePDFReport: function () {
                    var layoutTemplate = this.pdfTemplateSelect.get("value");
                    var printTemplate = new PrintTemplate();
                    var mapSize = this.reportingConfiguration.pdf.mapSize;
                    if (!mapSize) {
                        mapSize = {height: 500, width: 500}
                    }
                    var dpi = this.reportingConfiguration.pdf.mapDPI;
                    if (!dpi) {
                        dpi = 96;
                    }
                    printTemplate.exportOptions = {};
                    printTemplate.exportOptions.width = mapSize.width;
                    printTemplate.exportOptions.height = mapSize.height;
                    printTemplate.exportOptions.dpi = dpi;
                    printTemplate.format = "PDF";

                    printTemplate.layoutOptions = {};

                    var title = this.pdfTitle.get("value");
                    if (!title) {
                        printTemplate.layoutOptions.titleText = title;
                    }

                    if (this.reportingConfiguration.pdf.layoutOptions) {
                        lang.mixin(printTemplate.layoutOptions, this.reportingConfiguration.pdf.layoutOptions || {});
                    }

                    printTemplate.layout = layoutTemplate;
                    printTemplate.preserveScale = this.reportingConfiguration.pdf.preserveMapScale == null ? false : this.reportingConfiguration.pdf.preserveMapScale;
                    var printParameters = new PrintParameters();
                    printParameters.template = printTemplate;

                    printParameters.map = this.map;
                    if (this._printTask == null) {
                        this._printTask = new PrintTask(this.reportingConfiguration.pdf.exportWebMapTaskURL)
                    }
                    this._printTask.execute(printParameters, lang.hitch(this, this._handlePDFExportResponse), lang.hitch(this, this._handlePDFExportError));
                },
                _handlePDFExportResponse: function (response) {
                    if (response && response.url) {
                        window.open(response.url);
                    }
                    else {
                        this._handlePDFExportError();
                    }
                },
                _handlePDFExportError: function (err) {
                },
                /**
                 * generate the html report
                 * @private
                 */
                _generateHTMLReport: function () {
                    if (this.reportingConfiguration == null || !lang.isObject(this.reportingConfiguration) ||
                        this.reportingConfiguration.html == null || !lang.isObject(this.reportingConfiguration.html) ||
                        this.reportingConfiguration.html.templateURL == null
                        ) {
                        return;
                    }
                    var extent = this.map.extent;
                    if (!extent) {
                        return;
                    }
                    var currentLockRasterIds;
                    this._displayHTMLReport();
                },
                _displayHTMLReport: function (featuresByLayer) {
                    //do some magic here
                    var tableParameters = this._generateTableParameters(this.serviceQueryResponses);
                    var mapParameters = this._generateMapParameters(this.serviceQueryResponses);
                    //open the html report window
                    window._reportingWidgetParameters = {
                        mapParameters: mapParameters,
                        tableParameters: tableParameters
                    };
                    var opener = window.open(this.reportingConfiguration.html.templateURL);

                },
                /**
                 * generates the table parameters for the html report <table> element
                 * @param serviceQueryResponses
                 * @return {{displayFormats: {}, tableDataArray: Array, displayFields: *, hasSourceField: boolean}}
                 * @private
                 */
                _generateTableParameters: function (serviceQueryResponses) {
                    var i;
                    var tableDataArray = [];
                    var currentServiceQueryResponse;
                    //{featureSet: queryResponseJson, layer: layer})
                    var displayFormats = {};
                    if (this.displayFormats && this.displayFormats.date) {
                        displayFormats.date = this.displayFormats.date;
                    }
                    for (i = 0; i < serviceQueryResponses.length; i++) {
                        currentServiceQueryResponse = serviceQueryResponses[i];
                        var layer = currentServiceQueryResponse.queryLayerController.layer;
                        tableDataArray.push({
                            objectIdField: layer.objectIdField,
                            source: currentServiceQueryResponse.queryLayerController.label,
                            featureSet: currentServiceQueryResponse.featureSet
                        });
                    }
                    //we only want to render the fields that are visible in the shopping cart grid
                    var visibleCartFieldNames;
                    topic.publish(IMAGERY_GLOBALS.EVENTS.CART.GET_VISIBLE_FIELD_NAMES, function (viCtFdNms) {
                        visibleCartFieldNames = viCtFdNms;
                    });
                    var reportRenderFields = [];
                    var currentResultField;
                    for (i = 0; i < this.resultFields.length; i++) {
                        currentResultField = this.resultFields[i];
                        if (array.indexOf(visibleCartFieldNames, currentResultField.field) > -1) {
                            reportRenderFields.push(currentResultField);
                        }
                    }
                    return{
                        displayFormats: displayFormats,
                        tableDataArray: tableDataArray,
                        displayFields: reportRenderFields,
                        hasSourceField: true
                    }
                },
                /**
                 * generates the map parameters for the html report map control
                 * @param serviceQueryResponses
                 * @return {{basemap: *, extent: *, displayData: Array}}
                 * @private
                 */
                _generateMapParameters: function (serviceQueryResponses) {
                    var extent = this.map.extent;
                    if (extent == null) {
                        return {};
                    }
                    var currentBaseMap = this._getCurrentBasemapUrl();
                    if (currentBaseMap == null) {
                        return {};
                    }
                    var displayData = [];
                    var currentServiceQueryResponse;
                    //{featureSet: queryResponseJson, layer: layer})
                    var currentLayerMosaicRule;
                    for (var i = 0; i < serviceQueryResponses.length; i++) {
                        currentServiceQueryResponse = serviceQueryResponses[i];
                        var layer = currentServiceQueryResponse.queryLayerController.layer;
                        if (layer == null) {
                            continue;
                        }
                        currentLayerMosaicRule = layer.mosaicRule;
                        if (currentLayerMosaicRule && currentLayerMosaicRule.lockRasterIds && currentLayerMosaicRule.lockRasterIds.length > 0) {
                            displayData.push({layerUrl: layer.url, objectIds: currentLayerMosaicRule.lockRasterIds.join(",")});
                        }
                    }
                    return{
                        basemap: currentBaseMap,
                        extent: extent,
                        displayData: displayData
                    }
                }

            });
    });