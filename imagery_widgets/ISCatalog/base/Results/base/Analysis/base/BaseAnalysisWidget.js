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
        "dojo/dom-class",
        "dijit/_WidgetBase",
        "dijit/_TemplatedMixin"
    ],
    function (declare, domClass, _WidgetBase, _TemplatedMixin) {
        return declare([ _WidgetBase, _TemplatedMixin], {
            currentLayer: null,
            _hideNode: function (node) {
                if (!domClass.contains(node, "hidden")) {
                    domClass.add(node, "hidden");
                }
            },
            clear: function () {
            },
            _showNode: function (node) {
                if (domClass.contains(node, "hidden")) {
                    domClass.remove(node, "hidden");
                }
            },
            show: function () {
                this._showNode(this.domNode);
            },
            hide: function () {
                this._hideNode(this.domNode);
            },
            isVisible: function () {
                return   !domClass.contains(this.domNode, "hidden");
            },
            setLayer: function (layer) {
                this.clear();
                this.currentLayer = layer;
                this.reload();
                return this.isSupportedLayer();
            },
            reload: function () {

            },
            isSupportedLayer: function () {
                return false;
            }
        });

    });
