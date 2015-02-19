## Coordinate ##
### Overview ###
The Coordinate widget displays x, y-coordinates dynamically when the pointer moves around the map. By default, the coordinate values are based on the spatial reference of the first basemap.

### Attributes ###
* `outputunit`: String; default: geo; Valid values are dms and geo.
dms: The output formlooks like 26° 3211 N 123° 37′12 W.
geo: The output format looks like Latitude: 26.497302 Longitude: -120.851562.
* `spatialReferences`: Object[]; default: no default; Shows a pop-up menu containing all configured spatial references when the mouse hovers over the widget.
    - `wkid`:  Number; default: no default; Well-known ID. For more details see  
    https://developers.arcgis.com/en/javascript/jshelp/ref_coordsystems.html.
    - `label`: String, default: no default; A label for the specified WKID.
    - `transformationWkid`: Number;default: no default; The well-known id {wkid:number} for the datum transfomation to be applied on the projected geometries.
    - `transformationLabel`: String, default: no default; The well-known text {wkt:string} for the datum transfomation to be applied on the projected geometries.


Example:
```
{
  "outputunit": "dms",
  "spatialReferences": [{
    "wkid": 2000,
    "label": "Anguilla_1957_British_West_Indies_Grid"
  },{
    "wkid": 2001,
    "label": "Antigua_1943_British_West_Indies_Grid"
  },{
    "wkid": 2274,
    "label": "NAD_1983_StatePlane_Tennessee_FIPS_4100_Feet"
  }]
}
```
