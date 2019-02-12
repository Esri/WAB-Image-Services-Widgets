# IS Catalog
The IS Catalog widget allows users to search and discover imagery contained across multiple image services.
## Sections

* [Features](#features)
* [Requirements](#requirements)
* [Instructions](#instructions)
* [Configuration](#configuration)
* [Resources](#resources)
* [Issues](#issues)
* [Contributing](#contributing)
* [Licensing](#licensing)

## Features
* Search for imagery contained across multiple image services
* Preview imagery
* Filter and sort search results
* Perform analysis on discovered imagery
* Download imagery (if supported by image service)
* Export imagery to web map

## Requirements
* ArcGIS WebApp Builder v.1.0

## Instructions
In order to develop and test widgets you need to deploy the ISCatalog directory to the stemapp/widgets directory in your WebApp Builder installation.


## Configuration

In edit mode of WebApp Builder click "configure this widget" near the bottom of the IS Catalog widget icon.

**Service Configuration**

Use the list below to load the image services you want to add to the ISCatalog Widget. The steps are repeated for each image service you would like to add.

* Inside of the configuration window paste a URL to an image service and click "Load".
* Click on the "Web Map Checkout" checkbox if you want to save the image as a web map in your ArcGIS Online account. Click on the "CSV Export" checkbox if you want to download the data as CSV file.
* Click on the "Cloud Cover Sort" and "Acquisition Date Sort" checkboxes if you want to sort the results based on cloud cover and acquisition date respectively.
* The image service will now be loaded into the configuration window with fields and labelling options displayed.
 * *Display Name* - Label used to identify which service the search results come from
 * *Sort Configuration* - allow the user to sort the service's search results by these fields. If the service does not contain these fields please leave them unchecked. Sortng can be done regardless on the basis of Sensor name.
* Display fields are all of the fields associated with each row in the image service
 * Click the checkbox next to the field name to enable the field in the IS Catalog Widget
 * *Display In* - Radio buttons either display the field value in the result itself ("Entry") or in a popup ("Info Popup") for the result
 * *Label* - The label to display to the user for the field in each result. The default is the field name in the image service.
 * *Value Append* - allows you to add to the field after the value. For instance, you can add a % or &deg; symbol to the end of a field value.
 * *Float Precision* - sets the precision of the decimal value (for decimal field types only)
 * *Bold* - Display the field as bold in the search results


**Improvements in version 1.15**

* A zooming functionality has been added to limit the set of imagery to search so that the results come faster.
* Requst for only 8-10 icon thumbnails is being made at a time.
* Sorting based on sensor name.
* Improved UI.


## Issues
* Find a bug or want to request a new feature?  Please let us know by submitting an issue.

## Contributing
Esri welcomes contributions from anyone and everyone. Please see our [guidelines for contributing](https://github.com/esri/contributing).


## Licensing
Copyright 2013 Esri

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

A copy of the license is available in the repository's
[license.txt](license.txt) file.

[](Esri Tags: ArcGIS Defense and Intelligence Military Environment Planning Analysis Emergency Management Local-Government Local Government State-Government State Government Utilities)
[](Esri Language: Javascript)
