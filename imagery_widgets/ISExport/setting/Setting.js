///////////////////////////////////////////////////////////////////////////
// Copyright 2018 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
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
///////////////////////////////////////////////////////////////////////////

define([
    'dojo/_base/declare',
    'dojo/dom',
    'dojo/dom-construct',
    'dojo/dom-style',
    'dijit/registry',
    'jimu/BaseWidgetSetting',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/form/Select'
],
        function (
                declare,
                dom,
                domConstruct,
                domStyle,
                registry,
                BaseWidgetSetting,
                _WidgetsInTemplateMixin,
                Select) {
            return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
                baseClass: 'jimu-widget-ISExport-setting',
                startup: function () {
                    this.inherited(arguments);
                    this.setConfig(this.config);
                },
                postCreate: function () {
                    this.inherited(arguments);

                },
                setConfig: function (config) {
                    this.config = config;
                },
                getConfig: function () {
                    this.config.exportMode = registry.byId("settingsSaveMode").get("value");
                    return this.config;
                }




            });
        });