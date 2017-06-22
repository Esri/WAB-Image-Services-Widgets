///////////////////////////////////////////////////////////////////////////
// Copyright © 2016 Esri. All Rights Reserved.
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
    'dojo/_base/lang',
    'dojo/dom-style',
    'jimu/BaseWidgetSetting',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/registry',
    '../Palette',
    'dijit/form/TextBox'
  ],
  function(
    declare,
    lang,
    domStyle,
    BaseWidgetSetting,
    _WidgetsInTemplateMixin,
    registry,
    Palette) {
    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {

      baseClass: 'jimu-widget-ISScatterplot-setting',

      startup: function() {
        this.inherited(arguments);
        
        this.startPalette = new Palette({
          onChange: lang.hitch(this,this.changeColor)
        },"startColorPalette").startup();
        this.endPalette = new Palette({
          onChange: lang.hitch(this,this.changeColor)
        },"endColorPalette").startup();
        
        this.setConfig(this.config);
      },

      setConfig: function(config) {
        this.config = config;
        if(this.config.start){
          registry.byId("startColorPalette").set('value',this.config.start);
          domStyle.set('startnode','background-color',this.config.start);
        }
        if(this.config.end){
          registry.byId("endColorPalette").set('value',this.config.end);
          domStyle.set('endnode','background-color',this.config.end);
        }
      },

      getConfig: function() {
        this.config.start = registry.byId("startColorPalette").get('value');
        this.config.end = registry.byId("endColorPalette").get('value');
        
        return this.config;
      },
      
      changeColor: function(){
        registry.byId("startColorButton").closeDropDown();
        registry.byId("endColorButton").closeDropDown();
        domStyle.set('startnode','background-color',registry.byId("startColorPalette").get('value'));
        domStyle.set('endnode','background-color',registry.byId("endColorPalette").get('value'));
        if(registry.byId("startColorPalette").get('value')===registry.byId("endColorPalette").get('value')){
            domStyle.set('color-error','display','block');
        }
        else{
            domStyle.set('color-error','display','none');
        }
      }
      
    });
  });