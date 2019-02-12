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
        "dojo/dom-style",
        "dijit/_WidgetBase",
        "dijit/_TemplatedMixin",
        'dijit/_WidgetsInTemplateMixin',
    ],
    function (declare, domStyle, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin) {
        return declare(
            [  _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin],
            {
                boundsNumberBoxWidth: "5em",
                /**
                 * handles when values change
                 * @param valid  true when widget inputs are valid
                 */
                onValuesChanged: function (valid) {
                },
                /**
                 * returns the query geometry
                 * @return {null}
                 */
                getGeometry: function () {
                    return null;
                },
                /**
                 * returns true when the widgets inputs are valid
                 * @return {boolean}
                 */
                isValid: function () {
                    return true;
                },
                /**
                 * shows the widget
                 */
                show: function () {
                    domStyle.set(this.domNode, "display", "block");
                },
                /**
                 * hides the widget
                 */
                hide: function () {
                    domStyle.set(this.domNode, "display", "none");
                }
            });
    });