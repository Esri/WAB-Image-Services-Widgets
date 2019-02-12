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
    "dojo/_base/declare"
],
    function (declare) {
        return declare(
            [],
            {
                featureCollectionMixin: {
                    featureCollection: {
                        layers: [

                        ],
                        showLegend: false
                    }
                },
                annotationLayerRootMixin: {
                    title: "Map Notes",
                    visibility: true,
                    opacity: 1
                },
                annotationLayerMixin: {
                    popupInfo: {
                        title: "{TITLE}",
                        description: "{DESCRIPTION}",
                        mediaInfos: [
                            {
                                type: "image",
                                value: {
                                    sourceURL: "{IMAGE_URL}",
                                    linkURL: "{IMAGE_LINK_URL}"
                                }
                            }
                        ]
                    }

                },
                genericLayerDefinitionMixin: {
                    type: "Feature Layer",
                    displayField: "TITLE",
                    visibilityField: "VISIBLE",
                    hasAttachments: false,
                    objectIdField: "OBJECTID",
                    typeIdField: "TYPEID",
                    templates: [],
                    capabilities: "Query,Editing",
                    extent: {type: "extent", xmin: -180, ymin: -90, xmax: 180, ymax: 90, spatialReference: {wkid: "4326"},_partwise: null},
                    fields: [
                        {
                            name: "OBJECTID",
                            type: "esriFieldTypeOID",

                            alias: "OBJECTID",
                            editable: false
                        },
                        {
                            name: "TITLE",
                            type: "esriFieldTypeString",
                            alias: "Title",
                            editable: true,
                            length: 50
                        },
                        {
                            name: "VISIBLE",
                            type: "esriFieldTypeInteger",
                            alias: "Visible",
                            editable: true
                        },
                        {
                            name: "DESCRIPTION",
                            type: "esriFieldTypeString",
                            alias: "Description",
                            editable: true,
                            length: 1073741822
                        },
                        {
                            name: "IMAGE_URL",
                            type: "esriFieldTypeString",
                            alias: "Image URL",
                            editable: true,
                            length: 255
                        },
                        {
                            name: "IMAGE_LINK_URL",
                            type: "esriFieldTypeString",
                            alias: "Image Link URL",
                            editable: true,
                            length: 255
                        },
                        {
                            name: "DATE",
                            type: "esriFieldTypeDate",
                            alias: "DATE",
                            editable: true,
                            length: 36
                        },
                        {
                            name: "TYPEID",
                            type: "esriFieldTypeInteger",
                            alias: "Type ID",
                            editable: true
                        }
                    ]
                },
                pointLayerDefinitionMixin: {
                    name: "Points",
                    geometryType: "esriGeometryPoint",
                    "drawingInfo": {
                        "renderer": {
                            "field1": "TYPEID",
                            "type": "uniqueValue",
                            "uniqueValueInfos": [
                                {
                                    "symbol": {
                                        "color": [
                                            255,
                                            0,
                                            0,
                                            128
                                        ],
                                        "size": 18,
                                        "angle": 0,
                                        "xoffset": 0,
                                        "yoffset": 0,
                                        "type": "esriSMS",
                                        "style": "esriSMSCircle",
                                        "outline": {
                                            "color": [
                                                255,
                                                0,
                                                0,
                                                255
                                            ],
                                            "width": 1,
                                            "type": "esriSLS",
                                            "style": "esriSLSSolid"
                                        }
                                    },
                                    "value": "0",
                                    "label": "Cross"
                                }
                            ]
                        }
                    },
                    types: [
                        {
                            id: 0,
                            name: "Area",
                            domains: {},
                            templates: [
                                {
                                    name: "Area",
                                    description: "",
                                    drawingTool: "esriFeatureEditToolPolygon",
                                    prototype: {
                                        attributes: {
                                            TYPEID: 0,
                                            VISIBLE: 1,
                                            TITLE: "Area"
                                        }
                                    }
                                },
                                {
                                    name: "Triangle",
                                    description: "",
                                    drawingTool: "esriFeatureEditToolTriangle",
                                    prototype: {
                                        attributes: {
                                            TYPEID: 0,
                                            VISIBLE: 1,
                                            TITLE: "Area"
                                        }
                                    }
                                },
                                {
                                    name: "Rectangle",
                                    description: "",
                                    drawingTool: "esriFeatureEditToolRectangle",
                                    prototype: {
                                        attributes: {
                                            TYPEID: 0,
                                            VISIBLE: 1,
                                            TITLE: "Area"
                                        }
                                    }
                                },
                                {
                                    name: "Left Arrow",
                                    description: "",
                                    drawingTool: "esriFeatureEditToolLeftArrow",
                                    prototype: {
                                        attributes: {
                                            TYPEID: 0,
                                            VISIBLE: 1,
                                            TITLE: "Area"
                                        }
                                    }
                                },
                                {
                                    name: "Right Arrow",
                                    description: "",
                                    drawingTool: "esriFeatureEditToolRightArrow",
                                    prototype: {
                                        attributes: {
                                            TYPEID: 0,
                                            VISIBLE: 1,
                                            TITLE: "Area"
                                        }
                                    }
                                },
                                {
                                    name: "Ellipse",
                                    description: "",
                                    drawingTool: "esriFeatureEditToolEllipse",
                                    prototype: {
                                        attributes: {
                                            TYPEID: 0,
                                            VISIBLE: 1,
                                            TITLE: "Area"
                                        }
                                    }
                                },
                                {
                                    name: "Up Arrow",
                                    description: "",
                                    drawingTool: "esriFeatureEditToolUpArrow",
                                    prototype: {
                                        attributes: {
                                            TYPEID: 0,
                                            VISIBLE: 1,
                                            TITLE: "Area"
                                        }
                                    }
                                },
                                {
                                    name: "Down Arrow",
                                    description: "",
                                    drawingTool: "esriFeatureEditToolDownArrow",
                                    prototype: {
                                        attributes: {
                                            TYPEID: 0,
                                            VISIBLE: 1,
                                            TITLE: "Area"
                                        }
                                    }
                                },
                                {
                                    name: "Circle",
                                    description: "",
                                    drawingTool: "esriFeatureEditToolCircle",
                                    prototype: {
                                        attributes: {
                                            TYPEID: 0,
                                            VISIBLE: 1,
                                            TITLE: "Area"
                                        }
                                    }
                                },
                                {
                                    name: "Freehand Area",
                                    description: "",
                                    drawingTool: "esriFeatureEditToolFreehand",
                                    prototype: {
                                        attributes: {
                                            TYPEID: 0,
                                            VISIBLE: 1,
                                            TITLE: "Area"
                                        }
                                    }
                                }
                            ]
                        }
                    ]
                },
                polygonLayerDefinitionMixin: {
                    name: "Areas",
                    geometryType: "esriGeometryPolygon",
                    drawingInfo: {
                        renderer: {
                            type: "uniqueValue",
                            field1: "TYPEID",
                            uniqueValueInfos: [
                                {
                                    value: "0",
                                    label: "Area",
                                    description: "",
                                    symbol: {
                                        type: "esriSFS",
                                        style: "esriSFSSolid",
                                        color: [
                                            255,
                                            0,
                                            0,
                                            128
                                        ],
                                        outline: {
                                            type: "esriSLS",
                                            style: "esriSLSSolid",
                                            color: [
                                                255,
                                                0,
                                                0,
                                                255
                                            ],
                                            width: 1.5
                                        }
                                    }
                                }
                            ]
                        }
                    },
                    types: [
                        {
                            id: 0,
                            name: "Area",
                            domains: {},
                            templates: [
                                {
                                    name: "Area",
                                    description: "",
                                    drawingTool: "esriFeatureEditToolPolygon",
                                    prototype: {
                                        attributes: {
                                            TYPEID: 0,
                                            VISIBLE: 1,
                                            TITLE: "Area"
                                        }
                                    }
                                },
                                {
                                    name: "Triangle",
                                    description: "",
                                    drawingTool: "esriFeatureEditToolTriangle",
                                    prototype: {
                                        attributes: {
                                            TYPEID: 0,
                                            VISIBLE: 1,
                                            TITLE: "Area"
                                        }
                                    }
                                },
                                {
                                    name: "Rectangle",
                                    description: "",
                                    drawingTool: "esriFeatureEditToolRectangle",
                                    prototype: {
                                        attributes: {
                                            TYPEID: 0,
                                            VISIBLE: 1,
                                            TITLE: "Area"
                                        }
                                    }
                                },
                                {
                                    name: "Left Arrow",
                                    description: "",
                                    drawingTool: "esriFeatureEditToolLeftArrow",
                                    prototype: {
                                        attributes: {
                                            TYPEID: 0,
                                            VISIBLE: 1,
                                            TITLE: "Area"
                                        }
                                    }
                                },
                                {
                                    name: "Right Arrow",
                                    description: "",
                                    drawingTool: "esriFeatureEditToolRightArrow",
                                    prototype: {
                                        attributes: {
                                            TYPEID: 0,
                                            VISIBLE: 1,
                                            TITLE: "Area"
                                        }
                                    }
                                },
                                {
                                    name: "Ellipse",
                                    description: "",
                                    drawingTool: "esriFeatureEditToolEllipse",
                                    prototype: {
                                        attributes: {
                                            TYPEID: 0,
                                            VISIBLE: 1,
                                            TITLE: "Area"
                                        }
                                    }
                                },
                                {
                                    name: "Up Arrow",
                                    description: "",
                                    drawingTool: "esriFeatureEditToolUpArrow",
                                    prototype: {
                                        attributes: {
                                            TYPEID: 0,
                                            VISIBLE: 1,
                                            TITLE: "Area"
                                        }
                                    }
                                },
                                {
                                    name: "Down Arrow",
                                    description: "",
                                    drawingTool: "esriFeatureEditToolDownArrow",
                                    prototype: {
                                        attributes: {
                                            TYPEID: 0,
                                            VISIBLE: 1,
                                            TITLE: "Area"
                                        }
                                    }
                                },
                                {
                                    name: "Circle",
                                    description: "",
                                    drawingTool: "esriFeatureEditToolCircle",
                                    prototype: {
                                        attributes: {
                                            TYPEID: 0,
                                            VISIBLE: 1,
                                            TITLE: "Area"
                                        }
                                    }
                                },
                                {
                                    name: "Freehand Area",
                                    description: "",
                                    drawingTool: "esriFeatureEditToolFreehand",
                                    prototype: {
                                        attributes: {
                                            TYPEID: 0,
                                            VISIBLE: 1,
                                            TITLE: "Area"
                                        }
                                    }
                                }
                            ]
                        }
                    ]
                },
                lineLayerDefinitionMixin: {
                    name: "Lines",
                    geometryType: "esriGeometryPolyline",
                    drawingInfo: {
                        renderer: {
                            type: "uniqueValue",
                            field1: "TYPEID",
                            uniqueValueInfos: [
                                {
                                    value: "0",
                                    label: "Line",
                                    description: "",
                                    symbol: {
                                        type: "esriSLS",
                                        style: "esriSLSSolid",
                                        color: [
                                            255,
                                            0,
                                            0,
                                            255
                                        ],
                                        width: 1.5
                                    }
                                }
                            ]
                        }
                    },
                    types: [
                        {
                            id: 0,
                            name: "Line",
                            domains: {},
                            templates: [
                                {
                                    name: "Line",
                                    description: "",
                                    drawingTool: "esriFeatureEditToolLine",
                                    prototype: {
                                        attributes: {
                                            TYPEID: 0,
                                            VISIBLE: 1,
                                            TITLE: "Line"
                                        }
                                    }
                                },
                                {
                                    name: "Freehand Line",
                                    description: "",
                                    drawingTool: "esriFeatureEditToolFreehand",
                                    prototype: {
                                        attributes: {
                                            TYPEID: 0,
                                            VISIBLE: 1,
                                            TITLE: "Line"
                                        }
                                    }
                                }
                            ]
                        }
                    ]
                },
                textLayerDefinitionMixin: {
                    name: "Text",
                    geometryType: "esriGeometryPoint",
                    drawingInfo: {
                        renderer: {
                            type: "uniqueValue",
                            field1: "TYPEID",
                            uniqueValueInfos: [
                                {
                                    value: "0",
                                    label: "Text",
                                    description: "",
                                    symbol: {
                                        type: "esriTS",
                                        color: [
                                            0,
                                            0,
                                            0,
                                            255
                                        ],
                                        verticalAlignment: "baseline",
                                        horizontalAlignment: "left",
                                        font: {
                                            family: "Arial",
                                            size: 12,
                                            style: "normal",
                                            weight: "bold"
                                        }
                                    }
                                }
                            ]
                        }
                    },
                    types: [
                        {
                            id: 0,
                            name: "Text",
                            domains: {},
                            templates: [
                                {
                                    name: "Text",
                                    description: "",
                                    drawingTool: "esriFeatureEditToolText",
                                    prototype: {
                                        "attributes": {
                                            "TYPEID": 0,
                                            "VISIBLE": 1
                                        }
                                    }
                                }
                            ]
                        }
                    ]
                }

            });


    });