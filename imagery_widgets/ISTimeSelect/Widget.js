define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/on",
  "dojo/query",
  "dojo/dom-class",
  "dojo/date/locale",
  "dojo/Deferred",
  "dijit/registry",
  "jimu/BaseWidget",
  'dojo/text!./Widget.html',
  "dijit/_WidgetsInTemplateMixin",
  "dojo/dnd/Moveable",
  "esri/layers/ImageServiceParameters",
  "esri/layers/ArcGISImageServiceLayer",
  "dijit/ConfirmDialog",
  "put-selector/put",
  "dojo/store/Memory",
  "esri/layers/MosaicRule",
  "esri/tasks/query",
  "esri/tasks/QueryTask",
  "esri/geometry/mathUtils",
  "dojo/dom-style",
  "dijit/Toolbar",
  "dijit/form/Button",
  "dijit/form/Select"
], function (declare, lang, array, on, query, domClass, locale, Deferred,registry,
             BaseWidget,template, _WidgetsInTemplateMixin, Moveable, ImageServiceParameters,ArcGISImageServiceLayer,ConfirmDialog, put, Memory,
             MosaicRule, Query, QueryTask, mathUtils,domStyle) {

  /**
   * ISTimeSelect
   *  - This WAB widget allows for temporal filtering of an Image Service
   */
  return declare([BaseWidget, _WidgetsInTemplateMixin], {

    // BASE CLASS //
    baseClass: "ISTimeSelect",

    // PAN/ZOOM FACTORS //
    mapZoomFactor: 2.0,
    mapWidthPanFactor: 0.75,
    extentShrinkFactor: 0.9,
    previousLayer : null,
    // IS CURRENT DATE FIRST/LAST //
    isOldest: true,
    isNewest: true,
primaryLayer:  null,
    /**
     *
     */
    postCreate: function () {
      this.inherited(arguments);
      
      registry.byId("imageMosaicSelect").on("change",lang.hitch(this, this.mosaicRuleApplied));
      // MAKE MOVABLE //
      new Moveable(this.containerNode, {handle: this.titleNode});

      // INITIALIZE IMAGERY DATE SELECT //
      this.imageryDateSelect.set("store", new Memory({data: []}));
      this.map.on("extent-change", lang.hitch(this, this._mapExtentChange));
      this.map.on("update-end", lang.hitch(this,this._configureImageServiceLayer));
    },

    /**
     * VALIDATE CONFIG
     *  - WE NEED A TITLE, AN LAYER ID, AND A DATE FIELD.
     */
    mosaicRuleApplied: function(){
      var dateValue = registry.byId("imageDateValue").get("value");
      this._onDateChange(dateValue);
    },
    _validateConfig: function () {
      // TITLE //
      var hasTitle = this.config.hasOwnProperty("title") && (this.config.title != null) && (this.config.title.length > 0);
      // LAYER ID //
   //   var hasLayerId = this.config.hasOwnProperty("layerId") && (this.config.layerId != null) && (this.config.layerId.length > 0);
      // DATE FIELD //
      var hasDateField = this.config.hasOwnProperty("dateField") && (this.config.dateField != null && this.config.dateField.length > 0);
      // VALIDATE //
      return hasTitle && hasDateField;
      //return hasTitle && hasLayerId && hasDateField;
    },

    /**
     *  WIDGET IS OPENED
     */
    onOpen: function () {
      this.inherited(arguments);
      if(this.config.mosaicMethodCheckBox === false){
          domStyle.set("mosaicMethodSelection","display","none");
      }
      else {
          domStyle.set("mosaicMethodSelection","display","block");
      }
      if(!this.previousInfo) {
        // INITIAL INFO //
        this.previousInfo = {
          hasImagery: false,
          extent: this.map.extent,
          level: this.map.getLevel()
        };
        this.previousExtentChangeLevel = this.previousInfo.level;

        // VALIDATE CONFIG //
        this.hasValidConfig = this._validateConfig();
      }

      // UPDATE DATE CONTROLS //
      this.updateDateControls();

      // DO WE HAVE A VALID CONFIGURATION //
      if(this.hasValidConfig) {
        // HAS THE LAYER BEEN CREATED YET //
        if(this.primaryLayer == null) {
          // ADD THE IMAGE SERVICE LAYER //
          this._configureImageServiceLayer().then(lang.hitch(this, function () {
            // GET IMAGERY DATES //
           // this.getImageryDates();
          }), console.warn);
        }
      } else {
        console.warn(this.nls.invalidConfigMessage, this.config);
        alert(this.nls.invalidConfigMessage);
      }
    },

    /**
     * WIDGET IS CLOSED
     */
    
    onClose: function () {
      this.inherited(arguments);
    },

    /**
     *
     * @private
     */
    _configureImageServiceLayer: function () {
      var deferred = new Deferred();

      // VALID CONFIG //
      if(this.hasValidConfig) {
        //console.info("LAYER ID: ", this.config.layerId);
        //this.previousLayer = this.ISLayer;
        // IMAGE SERVICE LAYER //
         if (this.map.layerIds) {
                        if (this.map.getLayer("resultLayer")) {
                            this.resultLayer = this.map.getLayer("resultLayer");
                            this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 2]);
                            this.secondaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 3]);
                            this.primaryLayerPosition = this.map.layerIds.length - 2;
                            } else {
                            this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 1]);
                            this.secondaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 2]);
                            this.primaryLayerPosition = this.map.layerIds.length - 1;
                }
                    }
                    
      //  this.ISLayer = this.map.getLayer(this.config.layerId);
        if(this.primaryLayer) {
          // DEFAULT MOSAIC RULE //
          this.defaultMosaicRule = this.primaryLayer.defaultMosaicRule || lang.clone(this.primaryLayer.mosaicRule);
          // SET MAP WAIT CURSOR WHILE UPDATING LAYER //
          this.primaryLayer.on("update-start", lang.hitch(this.map, this.map.setMapCursor, "wait"));
          this.primaryLayer.on("update-end", lang.hitch(this.map, this.map.setMapCursor, "default"));
          // MAP EXTENT CHANGE //
       //  this.map.on("extent-change", lang.hitch(this, this._mapExtentChange));
          if(this.previousLayer !== this.primaryLayer.url){
              this.getImageryDates();
             
          }
          this.previousLayer = this.primaryLayer.url;
                deferred.resolve();
        } else {
          console.warn("Can't find configured layer in this map: ", this.config);
          deferred.reject()
        }
      } else {
        console.warn("Invalid configuration: ", this.config);
        deferred.reject()
      }

      return deferred.promise;
    },

    /**
     * UPDATE DATE CONTROLS BASED ON CURRENT ZOOM LEVEL, IMAGERY AVAILABILITY WITHIN CURRENT EXTENT, AND IMAGE INDEX
     *
     * @private
     */
    updateDateControls: function () {

      // VALID ZOOM LEVEL //
      var validZoomLevel = (this.map.getLevel() >= this.config.minZoomLevel);
      // IMAGERY AVAILABILITY //
      var hasImagery = this.previousInfo.hasImagery;

      // ENABLED //
      this.enabled = (hasImagery && validZoomLevel);

      // ENABLE PREV/NEXT BUTTONS //
      this.prevBtn.set("disabled", (!this.enabled) || this.isOldest);
      this.nextBtn.set("disabled", (!this.enabled) || this.isNewest);

      // ENABLE DATE SELECT //
      this.imageryDateSelect.set("disabled", !this.enabled);

      if(!this.enabled) {
        // RESET DISPLAY MESSAGE //
        this.setDisplayMessage((!validZoomLevel) ? this.nls.zoomInToSelectDate : this.nls.noImageryAvailable);
        // USE DEFAULT MOSAIC RULE //
        if(this.primaryLayer && this.defaultMosaicRule) {
          this.primaryLayer.setMosaicRule(this.defaultMosaicRule);
        }
      }

    },

    /**
     * SET DISPLAY MESSAGE
     *
     * @param message
     */
    setDisplayMessage: function (message) {
      this.imageryDateSelect._setDisplay(message || "");
    },

    /**
     * MAP EXTENT CHANGE EVENT
     *
     * @param evt
     * @private
     */
    _mapExtentChange: function (evt) {

      // VALID ZOOM LEVEL //
      var validZoomLevel = (evt.lod.level >= this.config.minZoomLevel);
      if(validZoomLevel) {
        // HAS THE MAP EXTENT CHANGED SUFFICIENT TO UPDATE THE DATES? //
        var needsUpdate = false;

        // NEEDS UPDATE BASED ON LEVEL CHANGE? //
        if(evt.levelChange) {
          var zoomLevelChange = Math.abs(evt.lod.level - this.previousInfo.level);
          if(zoomLevelChange >= this.mapZoomFactor) {
            console.info("LARGE zoom: ", evt);
            needsUpdate = true;
          } else {
            // NOT A SIGNIFICANT ZOOM LEVEL CHANGE BUT WE'VE CROSSED THE MIN ZOOM LEVEL THRESHOLD //
            if(this.previousExtentChangeLevel < this.config.minZoomLevel) {
              console.info("THRESHOLD zoom: ", evt);
              needsUpdate = true;
            }
          }
        } else {
          // NEEDS UPDATE BASED ON PAN CHANGE? //
          var panDistance = Math.abs(mathUtils.getLength(evt.extent.getCenter(), this.previousInfo.extent.getCenter()));
          var previousMapWidth = (this.previousInfo.extent.getWidth() * this.mapWidthPanFactor);
          if(panDistance > previousMapWidth) {
            console.info("LARGE pan: ", evt);
            needsUpdate = true;
          }
        }

        // NEEDS UPDATE //
        if(needsUpdate) {
          this.getImageryDates();
        }
      } else {
        this.updateDateControls();
      }

      // PREVIOUS EXTENT CHANGE LEVEL //
      this.previousExtentChangeLevel = evt.lod.level;
    },

    /**
     * USER CLICK ON PREVIOUS BUTTON
     *
     * @private
     */
    _onPreviousDate: function () {
      this._selectionOffset(1);
    },

    /**
     *  USER CLICK ON NEXT BUTTON
     *
     * @private
     */
    _onNextDate: function () {
      this._selectionOffset(-1);
    },

    /**
     * SELECTION OFFSET
     *  - USED BY PREV/NEXT BUTTONS
     *
     * @param offset
     * @private
     */
    _selectionOffset: function (offset) {
      var currentDateText = this.imageryDateSelect.get("value");
      var dateStore = this.imageryDateSelect.get("store");
      var selectionItem = dateStore.data[dateStore.index[+currentDateText] + offset];
      if(selectionItem) {
        this.imageryDateSelect.set("value", selectionItem.id);
      } else {
        console.info("Could not find item: ", currentDateText, selectionItem);
      }
    },

    /**
     * RETRIEVE DATES OF IMAGERY IN CURRENT MAP EXTENT
     *
     * @private
     */
    getImageryDates: function () {
      var deferred = new Deferred();

      if(this.hasValidConfig) {

        // CANCEL PREVIOUS REQUESTS //
        if(this.getImageDatesHandle && !this.getImageDatesHandle.isFulfilled()) {
          this.getImageDatesHandle.cancel();
        }

        // GET CURRENT DATE //
        var currentValue = this.imageryDateSelect.get("value");
        // DISPLAY MESSAGE //
        this.setDisplayMessage(this.nls.findingImageryDates);

        // DATE QUERY //
        var dateQuery = new Query();
        dateQuery.where = "Category = 1";
        dateQuery.geometry = this.map.extent.expand(this.extentShrinkFactor);
        dateQuery.returnGeometry = false;
        dateQuery.outFields = [this.config.dateField];
        dateQuery.orderByFields = [this.config.dateField + " DESC"];

        // QUERY TASK //
        var queryTask = new QueryTask(this.primaryLayer.url);
        this.getImageDatesHandle = queryTask.execute(dateQuery).then(lang.hitch(this, function (featureSet) {
          //console.info("getImageryDates: ", featureSet);

          // DO WE HAVE IMAGERY IN THIS EXTENT? //
          var hasImagery = (featureSet.features.length > 0);

          // PREVIOUS INFO //
          this.previousInfo = {
            hasImagery: hasImagery,
            extent: this.map.extent,
            level: this.map.getLevel()
          };

          // IMAGERY DATES STORE //
          var imageryDatesStore = new Memory({data: []});

          // CREATE UNIQUE LIST OF DATES WITH MATCHING LOCKRASTERIDS //
          array.forEach(featureSet.features, lang.hitch(this, function (feature) {
            // IMAGE ID //
            var imageId = feature.attributes[this.primaryLayer.objectIdField];
            // IMAGE DATE //
            var dateValue = feature.attributes[this.config.dateField];

            // GET STORE ENTRY FOR THIS DATE //
            var imageInfo = imageryDatesStore.get(dateValue);
            if(!imageInfo) {
              // IMAGE DATE //
              var dateObj = new Date(dateValue);

              // FORMAT DATE //
              // TODO: MAKE THESE FORMATS CONFIGURABLE
              var queryDate = locale.format(dateObj, {selector: "date", datePattern: "yyyy/MM/dd"});
              var displayDate = locale.format(dateObj, {selector: "date", datePattern: "EEE dd MMM yyyy"});

              // ADD DATE INFO //
              imageryDatesStore.add({
                id: dateValue + "",  //  - MAKE SURE IT'S A STRING SO dijit/form/Select IS OK WITH THIS DATE VALUE AS ID //
                dateValue: dateValue,
                displayDate: displayDate,
                queryDate: queryDate,
                lockRasterIds: [imageId]
              });
            } else {
              // UPDATE DATE INFO lockRasterIds //
              imageInfo.lockRasterIds.push(imageId);
              imageryDatesStore.put(imageInfo);
            }
          }));

          // SET STORE FOR DATE SELECT //
          this.imageryDateSelect.set("store", imageryDatesStore);

          // SET CURRENT TO PREVIOUS IF PREVIOUS DATE STILL EXISTS IN NEW LIST OF DATES //
          if(currentValue && (imageryDatesStore.get(currentValue) != null)) {
            this.imageryDateSelect.set("value", currentValue);
            this._onDateChange(currentValue);
          } else {
            if(hasImagery) {
              var newCurrentValue = imageryDatesStore.data[0].id;
              this.imageryDateSelect.set("value", newCurrentValue);
              this._onDateChange(newCurrentValue);
            } else {
              this.updateDateControls();
            }
          }
          deferred.resolve();
        }));
      } else {
        deferred.reject();
      }

      return deferred.promise;
    },

    /**
     * NEW DATE SELECTED IN DATE SELECT LIST
     *
     * @param selectedDateText
     * @private
     */
    _onDateChange: function (selectedDateText) {
      var deferred = new Deferred();

      //console.info("_onDateChange: ", new Date(+selectedDateText));

      if(this.hasValidConfig) {
        // GET SELECTED ITEM //
        var imageryDatesStore = this.imageryDateSelect.get("store");
        var selectedItem = imageryDatesStore.get(selectedDateText);
        if(selectedItem) {

          //       - http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#/Mosaic_rule_objects/02r3000000s4000000/
          //
          //         ByAttribute: Orders rasters based on the absolute distance between their values of an attribute and a base value. Only numeric or date fields are applicable. Mosaic results are view-independent.
          //
          //            {
          //              "mosaicMethod" : "esriMosaicAttribute", //required
          //              "sortField" : "<sortFieldName>",//required, numeric or date fields only.
          //              "sortValue" : <sortValue>,//optional, default is null or 0. Use numeric values for numeric fields and use the following string format for date field:
          //                            yyyy/MM/dd HH:mm:ss.s
          //                            yyyy/MM/dd HH:mm:ss
          //                            yyyy/MM/dd HH:mm
          //                            yyyy/MM/dd HH
          //                            yyyy/MM/dd
          //                            yyyy/MM
          //                            yyyy
          //
          //                "ascending" : <true | false>,//optional, default is true
          //                "where" : "<where>", //optional
          //                "fids" : [<fid1>, <fid2>],//optional
          //                "mosaicOperation" : "<MT_FIRST | MT_BLEND | MT_SUM>" //default is MT_FIRST
          //              }
          //
          //          LockRaster: Displays only the selected rasters. Mosaic results are view-independent.
          //
          //            {
          //              "mosaicMethod" : "esriMosaicLockRaster", //required
          //              "lockRasterIds" : [<rasterId1>, <rasterId2>],  //required
          //              "where" : "<where>", //optional
          //              "ascending" : <true | false>,//optional, default is true
          //              "fids" : [<fid1>, <fid2>],//optional
          //              "mosaicOperation" : "<MT_FIRST | MT_LAST | MT_MIN | MT_MAX | MT_MEAN | MT_BLEND | MT_SUM>" //default is MT_FIRST
          //            }
          //
          //       - http://desktop.arcgis.com/en/desktop/latest/manage-data/raster-and-images/understanding-the-mosaicking-rules-for-a-mosaic-dataset.htm


          // NEW MOSAIC RULE //
          var newMosaicRule = new MosaicRule();
          newMosaicRule.ascending = true;
          newMosaicRule.operation = MosaicRule.OPERATION_FIRST;
          if(this.config.mosaicMethodCheckBox === true)
          newMosaicRule.method = registry.byId("imageMosaicSelect").get("value");
else
    newMosaicRule.method = this.config.mosaicMethod;
          // MOSAIC METHOD //
          if(newMosaicRule.method === MosaicRule.METHOD_LOCKRASTER) {
            newMosaicRule.lockRasterIds = selectedItem.lockRasterIds;
          } else {
            newMosaicRule.sortField = this.config.dateField;
            newMosaicRule.sortValue = selectedItem.queryDate;
          }

          // SET MOSAIC RULE //
          this.primaryLayer.setMosaicRule(newMosaicRule);

          // SELECTION INDEX //
          var selectionIndex = imageryDatesStore.index[selectedItem.id];
          this.isOldest = (selectionIndex === (imageryDatesStore.data.length - 1));
          this.isNewest = (selectionIndex === 0);

          // UPDATE DATE CONTROLS //
          this.updateDateControls();

          deferred.resolve();
        } else {
          deferred.reject();
        }
      } else {
        deferred.reject();
      }

      return deferred.promise;
    }//,

    /**
     * USER CLICKS ABOUT BUTTON
     *  TODO: DO WE NEED A SEPARATE WIDGET FOR THIS?
     *
     * @private
     */
    /*_onAboutClick: function () {

     // ABOUT DIALOG CONTENT //
     var aboutContentNode = put("div.about-content");
     put(aboutContentNode, "div span", {innerHTML: lang.replace("{nls.aboutContent}. {nls.versionLabel}: {version}", this)});
     put(aboutContentNode, "hr +div span", {innerHTML: lang.replace("{nls.zoomLevelLabel}: {config.minZoomLevel}", this)});
     var currentNode = put(aboutContentNode, "hr +div");
     put(currentNode, "span", {innerHTML: lang.replace("{nls.currentItemLabel}: ", this)});

     // ITEM DETAILS //
     if(this.config.selectedItem) {
     put(currentNode, "a", {
     innerHTML: this.config.selectedItem.title,
     href: this.config.selectedItem.detailsPageUrl,
     target: "_blank"
     });
     var itemNode = put(currentNode, "div div.item-node");
     put(itemNode, "img.item-thumb", {src: this.config.selectedItem.thumbnailUrl});
     put(itemNode, "div.item-desc", {innerHTML: this.config.selectedItem.description});
     }

     // ABOUT DIALOG //
     var aboutDialog = new ConfirmDialog({
     title: this.nls.aboutLabel,
     content: aboutContentNode
     });
     domClass.add(aboutDialog.domNode, lang.replace("{baseClass}-aboutDlg", this));
     aboutDialog.show();

     }*/

  });
});