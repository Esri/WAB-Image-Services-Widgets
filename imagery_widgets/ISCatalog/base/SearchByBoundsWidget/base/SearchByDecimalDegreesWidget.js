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
    "dojo/text!./templates/SearchByDecimalDegreesTemplate.html",
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
                templateString: template,
                constructor: function(params){
                    lang.mixin(this,params || {});
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
                    return this.validateLatDDBounds() && this.validateLonDDBounds();
                },
                /**
                 * returns true if the LatDD inputs are valid
                 * @return {boolean}
                 */
                validateLatDDBounds: function () {
                    var minx = this.boundsLLXInput.get("value");
                    var maxx = this.boundsURXInput.get("value");
                    if (isNaN(minx) || isNaN(maxx)) {
                        return false;
                    }
                    return minx < maxx;
                },
                /**
                 * returns true if the LonDD inputs are valid
                 * @return {boolean}
                 */
                validateLonDDBounds: function () {
                    var miny = this.boundsLLYInput.get("value");
                    var maxy = this.boundsURYInput.get("value");
                    if (isNaN(miny) || isNaN(maxy)) {
                        return false;
                    }
                    return miny < maxy;
                },
                /**
                 returns the DD geometry
                 */
                getGeometry: function () {
                    var minx = this.boundsLLXInput.get("value");
                    var miny = this.boundsLLYInput.get("value");
                    var maxx = this.boundsURXInput.get("value");
                    var maxy = this.boundsURYInput.get("value");
                    return new Extent(minx, miny, maxx, maxy, new SpatialReference({wkid: this.searchWkid}));
                }

            });

    });