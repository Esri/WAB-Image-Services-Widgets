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
        "dojo/text!./templates/SearchByDMSTemplate.html",
        "./BaseSearchByWidget",
        "dijit/form/NumberTextBox",
        "esri/geometry/Extent",
        "esri/SpatialReference",
        "dojo/_base/lang"

    ],
    function (declare, template, BaseSearchByWidget, NumberTextBox, Extent, SpatialReference,lang) {
        return declare(
            [ BaseSearchByWidget],
            {
                searchWkid: 4326,
                boundsDMSBoxWidth: "2em",
                templateString: template,
                constructor: function (params) {
                    lang.mixin(this, params || {});
                },
                /**
                 * called when an input value is changed
                 * @return {*}
                 */
                handleValueChange: function () {
                    return this.onValuesChanged(this.isValid());
                },
                /**
                 * returns true when inputs are valid
                 * @return {*}
                 */
                isValid: function () {
                    return this.validateLatDMSBounds() && this.validateLonDMSBounds();
                },
                /**
                 * returns true if the Lat DMS inputs are valid
                 * @return {boolean}
                 */
                validateLatDMSBounds: function () {
                    var minxDeg = this.boundsLLDMSDegXInput.get("value");
                    var minxMin = this.boundsLLDMSMinXInput.get("value");
                    var minxSec = this.boundsLLDMSSecXInput.get("value");
                    if (isNaN(minxDeg)) {
                        return false;
                    }
                    var maxxDeg = this.boundsURDMSDegXInput.get("value");
                    var maxxMin = this.boundsURDMSMinXInput.get("value");
                    var maxxSec = this.boundsURDMSSecXInput.get("value");
                    if (isNaN(maxxDeg)) {
                        return false;
                    }
                    //convert both to DD
                    var minxDD = minxDeg + (isNaN(minxMin) ? 0 : (minxMin / 60)) + (isNaN(minxSec) ? 0 : (minxSec / 3600));
                    var maxxDD = maxxDeg + (isNaN(maxxMin) ? 0 : (maxxMin / 60)) + (isNaN(maxxSec) ? 0 : (maxxSec / 3600));

                    return minxDD < maxxDD;
                },
                /**
                 * returns true if the Lon DMS inputs are valid
                 * @return {boolean}
                 */
                validateLonDMSBounds: function () {
                    var minyDeg = this.boundsLLDMSDegYInput.get("value");
                    var minyMin = this.boundsLLDMSMinYInput.get("value");
                    var minySec = this.boundsLLDMSSecYInput.get("value");
                    if (isNaN(minyDeg)) {
                        return false;
                    }
                    var maxyDeg = this.boundsURDMSDegYInput.get("value");
                    var maxyMin = this.boundsURDMSMinYInput.get("value");
                    var maxySec = this.boundsURDMSSecYInput.get("value");
                    if (isNaN(maxyDeg)) {
                        return false;
                    }
                    //convert both to DD
                    var minyDD = minyDeg + (isNaN(minyMin) ? 0 : (minyMin / 60)) + (isNaN(minySec) ? 0 : (minySec / 3600));
                    var maxyDD = maxyDeg + (isNaN(maxyMin) ? 0 : (maxyMin / 60)) + (isNaN(maxySec) ? 0 : (maxySec / 3600));

                    return minyDD < maxyDD;
                },
                /**
                 * returns the DMS geometry
                 * @return {esri.geometry.Extent}
                 */
                getGeometry: function () {
                    var minxDeg = this.boundsLLDMSDegXInput.get("value");
                    var minxMin = this.boundsLLDMSMinXInput.get("value");
                    var minxSec = this.boundsLLDMSSecXInput.get("value");
                    var minx = minxDeg + (isNaN(minxMin) ? 0 : (minxMin / 60)) + (isNaN(minxSec) ? 0 : (minxSec / 3600));

                    var maxxDeg = this.boundsURDMSDegXInput.get("value");
                    var maxxMin = this.boundsURDMSMinXInput.get("value");
                    var maxxSec = this.boundsURDMSSecXInput.get("value");
                    var maxx = maxxDeg + (isNaN(maxxMin) ? 0 : (maxxMin / 60)) + (isNaN(maxxSec) ? 0 : (maxxSec / 3600));

                    var minyDeg = this.boundsLLDMSDegYInput.get("value");
                    var minyMin = this.boundsLLDMSMinYInput.get("value");
                    var minySec = this.boundsLLDMSSecYInput.get("value");
                    var miny = minyDeg + (isNaN(minyMin) ? 0 : (minyMin / 60)) + (isNaN(minySec) ? 0 : (minySec / 3600));

                    var maxyDeg = this.boundsURDMSDegYInput.get("value");
                    var maxyMin = this.boundsURDMSMinYInput.get("value");
                    var maxySec = this.boundsURDMSSecYInput.get("value");
                    var maxy = maxyDeg + (isNaN(maxyMin) ? 0 : (maxyMin / 60)) + (isNaN(maxySec) ? 0 : (maxySec / 3600));

                    return new Extent(minx, miny, maxx, maxy, new SpatialReference({wkid: this.searchWkid}));

                }
            });
    });