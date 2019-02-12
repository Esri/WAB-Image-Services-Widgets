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
        "dojo/_base/array",
        "dojo/_base/lang",
        "./../../../BaseDiscoveryMixin"
    ],
    function (declare, array, lang, BaseDiscoveryMixin) {
        return declare([BaseDiscoveryMixin], {
            useUTCDate: true,
            dateFormat: "dd MMM yyyy",
            _defaultDateFormat: "dd MMM yyyy",
            constructor: function (params) {
                lang.mixin(this, params || {});
                this._dateConfig = {
                    dateFormat: this.dateFormat || this._defaultDateFormat,
                    useUTCDate: (!this.useUTCDate && this.useUTCDate !== false) ? true : this.useUTCDate
                };
            },
            resultFeaturesToCSV: function (features) {
                if (!features || !features.length) {
                    features = [];
                }

                var asCSV, i, j, currentFeatureService, currentFeature, formattedFeatureValues = [], featureFieldObject;
                for (i = 0; i < features.length; i++) {
                    currentFeature = features[i];
                    currentFeatureService = currentFeature ? currentFeature[this.COMMON_FIELDS.SERVICE_FIELD] : null;
                    if (!currentFeatureService) {
                        continue;
                    }
                    featureFieldObject = this._getFeatureFieldValues(currentFeature, currentFeatureService);
                    formattedFeatureValues.push(featureFieldObject);
                }
                asCSV = Papa.unparse(formattedFeatureValues);
                var blob = new Blob([asCSV], {type: "text/plain;charset=utf-8"});
                saveAs(blob, "resultsExport.csv");
            },
            _writeFeatures: function () {

            },
            _getFeatureFieldValues: function (feature, featureService) {
                var formattedFieldValues = {}, detailField, displayFields, detailFields, attributes = feature.attributes;
                displayFields = featureService && featureService.displayFields ? featureService.displayFields : [];
                lang.mixin(formattedFieldValues, this._getFormattedFieldValues(feature, displayFields, featureService.__fieldConfiguration));
                detailFields = featureService && featureService.detailsFields ? featureService.detailsFields : [];
                lang.mixin(formattedFieldValues, this._getFormattedFieldValues(feature, detailFields, featureService.__fieldConfiguration));
                return formattedFieldValues;
            },
            _getFormattedFieldValues: function (feature, fields, fieldConfiguration) {
                var i, field, formattedFieldValues = {}, value;
                if (!fields || !fields.length) {
                    return formattedFieldValues;
                }
                for (i = 0; i < fields.length; i++) {
                    field = fields[i];
                    if (field.displayValue) {
                        value = field.displayValue;
                    }
                    else {
                        if (feature.attributes[field.name] || feature.attributes[field.name] === 0) {
                            value = feature.attributes[field.name];

                        }
                        else if (feature[field.name] || feature[field.name] === 0) {
                            value = feature[field.name];
                        }
                        if (field.valueReplacementMap && (field.valueReplacementMap[value] || field.valueReplacementMap[value] === 0)) {
                            value = field.valueReplacementMap[value];
                        }
                    }
                    if (value || value === 0) {
                        if (array.indexOf(fieldConfiguration.dateFields, field.name) > -1) {
                            value = this.getDateString(value, this.useUTCDate, this.dateFormat);
                        }
                        else {
                            if ((field.precision || field.precision === 0) && value.toFixed) {
                                value = value.toFixed(field.precision);
                            }
                            if (field.displayMultiplier) {
                                value = Math.ceil(value * field.displayMultiplier);
                            }
                        }
                        value = value.toString();
//                        if (field.valuePrepend) {
//                            value = field.valuePrepend + value;
//                        }
//                        if (field.valueAppend) {
//                            value += field.valueAppend;
//                            console.log(value);
//                        }
                    }
                    formattedFieldValues[field.exportLabel || field.label || field.name] = value;
                }
                return formattedFieldValues;
            }
        });
    })
;
