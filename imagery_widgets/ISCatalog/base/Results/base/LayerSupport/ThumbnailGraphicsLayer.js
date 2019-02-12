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
        "esri/layers/GraphicsLayer",
        "dojo/aspect",
        "dojo/_base/lang"
    ],
    function (declare, GraphicsLayer, aspect, lang) {
        return declare([GraphicsLayer], {
            constructor: function () {
                this._currentThumbnailIntersectExtent = null;
                //the aspect injects the polygon geometry to the picturemarker symbol.
                //this is done so that the thumbnail is displayed for the polygon being on the map and not just the center point of
                //the picture marker symbol
                aspect.before(this, "_intersects", lang.hitch(this, function (map, extent, useOrigin) {
                    return [map, this._currentThumbnailIntersectExtent, useOrigin];
                }));
            },
            add: function (graphic) {
                this.clear();
                this._currentThumbnailIntersectExtent = graphic._intersectExtent;
                this.inherited(arguments);
            },
            remove: function (graphic) {
                this._currentThumbnailIntersectExtent = null;
                this.inherited(arguments);
            },
            clear: function () {
                this._currentThumbnailIntersectExtent = null;
                this.inherited(arguments);
            }


        });

    });