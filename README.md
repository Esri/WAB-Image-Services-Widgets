# Web AppBuilder for Image Services 2.0

Web AppBuilder for Image Services (WABIS) is a set of custom widgets to be used in Web AppBuilder that are designed to work with image services. 

## Features


Widgets:
* The **IS Image Selector** widget allows the app user to search an imagery layer by a field (chosen during widget configuration), as well as set primary and secondary layers
* The **IS Layers** widget sets and changes the primary and secondary imagery layers in the app. After the app user performs analysis, it can also be used to add the Results layer to the secondary layer list.
* The **IS Change Detection** widget allows users to calculate the difference between the primary and secondary layer rasters. The result is added as a new Results layer, which can be added to the dropdown list of image services available to your app using the IS Layers widget.
* The **IS Compare** widget uses a vertical swipe to compare the topmost imagery layer with a secondary imagery layer. Optionally, users can also use transparency or a horizontal swipe to compare the primary and secondary imagery layers with a Results layer.IS Display Order
* The **IS Display Order** widget sets the mosaic rule for the primary layer, which determines which image in the mosaic will be visualized if images overlap.
* The **IS Display Parameters** widget allows users to set interpolation and compression for the primary layer.
* The **IS Renderer** widget sets the service functions and stretch on the primary layer. The dropdown menu in the widget is automatically populated with the service functions associated with the primary layer.
* The **IS Image Date** widget will show the date of the primary or secondary layer (whichever is visible in the app).
* The **IS Scatterplot** widget allows the user to select two bands from the image service layer and plot their values on a graph. The user can (1) highlight a region on the map by drawing and selecting the points on the plot, (2) click on the map to highlight that point on the scatterplot and get the pixel values, and (3) define an optional area of interest for which the plot should be drawn. Additionally, if both bands selected are the same, the widget will plot the frequency of that band. 
* The **IS Profile** widget shows a spectral or index profile (NDVI, NDMI Moisture Index, or Urban Index) for a selected point on the primary layer. 
* The **IS Export** widget allows the app user to either save the topmost visible imagery layer to the app user’s content in Portal, or to export the same image locally as a TIFF.

Theme: 
* 	Use the included **Foldable Wrapper** theme to size the widgets and remove unwanted  white  space. 


## Instructions

1. Download and unzip the .zip file.
2. Browse to the documentation folder.
3. Open and follow instructions in the "WABIS_V2_UserDoc.docx" 

## Requirements

* ArcGIS Online account
* Web AppBuilder for ArcGIS 2.4 Developer Edition
* Web Access

## Resources

* [Web App Builder for ArcGIS (Developer Edition)](https://developers.arcgis.com/web-appbuilder/)
* [Landsat Explorer example web app](http://landsatexplorer.esri.com/)

## Issues

Find a bug or want to request a new feature?  Please let us know by submitting an issue.

## Contributing

Want to contribute? Create your own fork, make your changes, then let us know via email.  

## Licensing
Copyright 2017 Esri

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

A copy of the license is available in the repository's [License.txt](License.txt?raw=true) file.



