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
    "dojo/text!./GeneralConfiguration.html",
    "dojo/_base/lang",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin"
],
    function (declare, template, lang, _WidgetBase, _TemplatedMixin) {
        return declare(
            [_WidgetBase, _TemplatedMixin],
            {
                defaultWhereClauseAppend: "Category = 1",
                serviceUrl: "",
                serviceDescription: null,
                ignoreFields: ["Shape", "Shape_Length", "Shape_Area"],
                templateString: template,


                hideNode: function (node) {
                    if (!domClass.contains(node, "hidden")) {
                        domClass.add(node, "hidden");
                    }
                },
                showNode: function (node) {
                    if (domClass.contains(node, "hidden")) {
                        domClass.remove(node, "hidden");
                    }
                }
            });
    });
