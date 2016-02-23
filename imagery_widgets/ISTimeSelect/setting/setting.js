define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/on",
  "dojo/json",
  "dojo/dom-class",
  "put-selector/put",
  "jimu/BaseWidgetSetting",
  "dijit/_WidgetsInTemplateMixin",
  "jimu/dijit/LayerChooserFromMap",
  "jimu/dijit/LayerChooserFromMapWithDropbox",
  "jimu/LayerInfos/LayerInfos",
  "esri/layers/ArcGISImageServiceLayer",
  "esri/layers/MosaicRule",
  "dojo/store/Memory",
  "dijit/form/Button",
  "dijit/form/TextBox",
  "dijit/form/NumberSpinner",
  "dijit/form/Select"
], function (declare, lang, array, on, json, domClass, put, BaseWidgetSetting, _WidgetsInTemplateMixin,
             LayerChooserFromMap, LayerChooserFromMapWithDropbox, LayerInfos,
             ArcGISImageServiceLayer, MosaicRule, Memory) {

  /**
   * ISTimeSelectSetting
   *  - Configure settings for the ISTimeSelect widget
   */
  return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {

    // BASE CLASS //
    baseClass: 'ISTimeSelectSetting',

    /**
     *
     */
    postCreate: function () {

      // SELECT LAYER //
      this.layerChooser = new LayerChooserFromMap({
        multiple: false,
        showLayerFromFeatureSet: false,
        createMapResponse: this.map.webMapResponse
      });
      // LAYER TYPE FILTER //
      this.layerChooser.filter = lang.hitch(this, function (layerInfo) {
        return (layerInfo.layerObject && (layerInfo.layerObject.type === "ArcGISImageServiceLayer"));
      });
      this.layerChooser.startup();

      // SELECT LAYER DROPDOWN //
      this.layerSelector = new LayerChooserFromMapWithDropbox({
        style: {width: "350px"},
        layerChooser: this.layerChooser
      }, put(this.imageServiceLayerSelector, "div"));
      this.layerSelector.startup();
      // LAYER SELECTED //
      on(this.layerSelector, "selection-change", lang.hitch(this, function (selectedLayerInfos) {
        this._layerSelected(selectedLayerInfos[0]);
      }));

      // SET INITIAL CONFIG //
      this.setConfig(this.config);
    },

    /**
     *
     * @param layerInfo
     * @private
     */
    _layerSelected: function (layerInfo) {

      // LAYER INFO //
      this.layerInfo = layerInfo;

      // DATE FIELD //
      var dateFieldStore = new Memory({
        idProperty: "name",
        data: array.filter(this.layerInfo.fields, function (field) {
          return (field.type === "esriFieldTypeDate");
        })
      });
      if(dateFieldStore.data.length > 0) {
        this.dateFieldsSelect.set("store", dateFieldStore);
        if(this.config.dateField && dateFieldStore.get(this.config.dateField)) {
          this.dateFieldsSelect.set("value", this.config.dateField);
        }
      } else {
        this.config.dateField = null;
        this.dateFieldsSelect.set("value", null);
        this.dateFieldsSelect._setDisplay(this.nls.noDateFields);
      }

      // ZOOM LEVEL //
      this.zoomLevelInput.set("value", this.layerInfo.minScale || this.config.minZoomLevel);

    },

    /**
     *
     * @param config
     */
    setConfig: function (config) {
      this.titleInput.set("value", config.title);
      this.dateFieldsSelect.set("value", config.dateField);
      this.zoomLevelInput.set("value", config.minZoomLevel);
      this.enableMosaicCheckBox.set("checked", config.mosaicMethodCheckBox);
        this.mosaicMethodSelect.set("value", config.mosaicMethod);
     },

    /**
     *
     * @returns {{configText: string}}
     */
    getConfig: function () {
      return {
        title: this.titleInput.get("value"),
        layerId: this.layerInfo ? this.layerInfo.id : "",
        dateField: this.dateFieldsSelect.get("value"),
        minZoomLevel: this.zoomLevelInput.get("value"),
        mosaicMethodCheckBox: this.enableMosaicCheckBox.get("checked"), 
       mosaicMethod: this.mosaicMethodSelect.get("value")
      };
    }
  });
});