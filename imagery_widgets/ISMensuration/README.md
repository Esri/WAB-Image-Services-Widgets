## Legend ##
### Overview ###
The legend widget displays a label and symbol for some or all of the layers in the map. If specified, the legend will respect scale dependencies and only display layers and sub layers that are currently visible in the map. The legend automatically updates if the visibility of a layer or sublayer changes.

### Attributes ###
* `legend`: An object of ArcGIS API for Javascript, see the params of [Legend Constructor](https://developers.arcgis.com/en/javascript/jsapi/legend-amd.html#legend1).

Example:
```
{
  "legend":{
    "arrangement": 0,
    "autoUpdate": true,
    "respectCurrentMapScale": true
  }
}
```