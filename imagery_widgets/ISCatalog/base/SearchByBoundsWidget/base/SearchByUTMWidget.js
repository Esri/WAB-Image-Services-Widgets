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
        "dojo/topic",
        "dojo/text!./templates/SearchByUTMTemplate.html",
        "dojo/_base/lang",
        "./BaseSearchByWidget",
        "../../BaseDiscoveryMixin",
        "dijit/form/NumberTextBox",
        "dijit/form/RadioButton",
        "dijit/form/Select",
        "esri/geometry/Point",
        "esri/SpatialReference"

    ],
    function (declare, topic, template, lang, BaseSearchByWidget, BaseDiscoveryMixin, NumberTextBox, RadioButton, Select, Point, SpatialReference) {
        return declare(
            [BaseSearchByWidget, BaseDiscoveryMixin],
            {
                utmLookupJsonUrl: "config/data/utm/UTMWKIDLookup.json",
                boundsUTMZoneSelectWidth: "3.5em",
                boundsUTMCoordInputWidth: "8em",

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
                postCreate: function () {
                    this.inherited(arguments);
                    this.loadJson(this.utmLookupJsonUrl, lang.hitch(this, this.handleUtmZoneLookupLoaded), lang.hitch(this, this.handleUtmZoneLookupLoadError));
                },
                /**
                 * called when the UTM lookup configuration file has been loaded
                 * @param response
                 */
                handleUtmZoneLookupLoaded: function (response) {
                    this.utmZoneLookup = response;
                    this._createUTMEntries();

                },
                /**
                 * called when there was an error loading UTM lookup configuration
                 */
                handleUtmZoneLookupLoadError: function () {
                    alert("Could not load UTM zone lookup for search by bounds widget");
                },
                /**
                 * returns true when inputs are valid
                 * @return {*}
                 */
                isValid: function () {
                    try {
                        var x = parseFloat(this.boundsUTMEastingTextbox.get("value"));
                        var y = parseFloat(this.boundsUTMNorthingTextbox.get("value"));
                        return !isNaN(x) && !isNaN(y);
                    }
                    catch (err) {
                        return false;
                    }
                },
                /**
                 * returns the UTM geometry
                 * @return {*}
                 */
                getGeometry: function () {
                    try {
                        var x = parseFloat(this.boundsUTMEastingTextbox.get("value"));
                        var y = parseFloat(this.boundsUTMNorthingTextbox.get("value"));
                        var spatialReferenceWkidString = this.boundsUTMZoneSelect.get("value") + (this.boundsUTMHemisphereN.get("checked") ? "N" : "S");
                        //lookup the wkid
                        var wkid = this.utmZoneLookup[spatialReferenceWkidString];
                        if (wkid == null) {
                            return null;
                        }

                        return new Point(x, y, new SpatialReference(wkid));
                    }
                    catch (err) {
                        return null;
                    }

                },
                /**
                 * creates the UTM entries in the widget select
                 * @private
                 */
                _createUTMEntries: function () {
                    var zoneCount = 0;
                    for (var key in this.utmZoneLookup) {
                        zoneCount++;
                    }
                    //utmZoneLookup is N and S so we need to halve the count
                    zoneCount = zoneCount / 2;
                    for (var i = 0; i < zoneCount; i++) {
                        this.boundsUTMZoneSelect.addOption({label: "" + (i + 1), value: (i + 1)});
                    }
                }

            });

    });