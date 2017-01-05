define(
  ["dojo/_base/declare",
    "dojo/_base/lang",
    'dojo/_base/html',
    "dojo/_base/Color",
    "dojo/on",
    "dijit/_TemplatedMixin",
    "dijit/_PaletteMixin",
    "dijit/_Widget",
    "dijit/hccss",
    "dojo/i18n",
    "dojo/dom-construct",
    "dojo/string",
    'jimu/utils',
    "dojo/text!./Palette.html",
    "dojo/i18n!dojo/nls/colors",
    "dojo/colors"
  ],
  function(
    declare,
    lang,
    html,
    Color,
    on,
    _TemplatedMixin,
    _PaletteMixin,
    _Widget,
    has,
    i18n,
    domConstruct,
    string,
    utils,
    template
    ){
    var ColorPalette = declare([_Widget, _TemplatedMixin, _PaletteMixin], {
      baseClass: "dijitColorPalette",
      templateString: template,
      palette: "3x4",
      _palettes: {
	"3x4": [
          ["#ffb3da", "#b5e61d", "#fff200", "#8cc8f0"],
          ["#ff0080", "#22b14c", "#ff7f27", "#0f4a81"],
          ["#f00a0a", "#880015", "#c8bfe7", "#a349a4"]
	],
        "7x10": [
            ["whitesmoke", "seashell", "cornsilk", "lemonchiffon", "lightyellow", "palegreen", "paleturquoise", "lightcyan", "lavender", "plum"],
            ["lightgray", "pink", "bisque", "moccasin", "khaki", "lightgreen", "lightseagreen", "lightskyblue", "cornflowerblue", "violet"],
            ["silver", "lightcoral", "sandybrown", "orange", "palegoldenrod", "chartreuse", "mediumturquoise", "skyblue", "mediumslateblue", "orchid"],
            ["darkgray", "red", "orangered", "darkorange", "yellow", "limegreen", "darkseagreen", "royalblue", "slateblue", "mediumorchid"],
            ["gray", "crimson", "chocolate", "coral", "gold", "forestgreen", "seagreen", "blue", "blueviolet", "darkorchid"],
            ["dimgray", "firebrick", "saddlebrown", "sienna", "olive", "green", "darkcyan", "mediumblue", "darkslateblue", "darkmagenta" ],
            ["darkslategray", "darkred", "maroon", "brown", "darkolivegreen", "darkgreen", "midnightblue", "navy", "indigo", "purple"]
	]
      },
      titles:{
        "#ffb3da": "pink", 
        "#b5e61d": "lime",
        "#fff200": "yellow",
        "#8cc8f0": "blue",
        "#ff0080": "deep pink",
        "#22b14c": "green",
        "#ff7f27": "orange",
        "#0f4a81": "indigo",
        "#f00a0a": "red",
        "#880015": "maroon",
        "#c8bfe7": "lavender",
        "#a349a4": "purple"
      },
      
      buildRendering: function(){
        // Instantiate the template, which makes a skeleton into which we'll insert a bunch of
	// <img> nodes
	this.inherited(arguments);

	//	Creates customized constructor for dye class (color of a single cell) for
	//	specified palette and high-contrast vs. normal mode.   Used in _getDye().
	this._dyeClass = declare(ColorPalette._Color, {
	  palette: this.palette
	});
        var titles;
        if(this.palette==="7x10")
          titles = i18n.getLocalization("dojo", "colors", this.lang);
        else
          titles = this.titles;

	// Creates <img> nodes in each cell of the template.
	this._preparePalette(
	  this._palettes[this.palette],
          titles
	  //i18n.getLocalization("dojo", "colors", this.lang)
        );  
      },

      _dyeFactory: function(value, row, col, title){
	// Overrides _PaletteMixin._dyeFactory().
	return new this._dyeClass(value, row, col, title);
      }
    });
    
    ColorPalette._Color = declare("dijit._Color", Color,{
      // summary:
      //		Object associated with each cell in a ColorPalette palette.
      //		Implements dijit/Dye.

      // Template for each cell in normal (non-high-contrast mode).  Each cell contains a wrapper
      // node for showing the border (called dijitPaletteImg for back-compat), and dijitColorPaletteSwatch
      // for showing the color.
      template: "<span class='dijitInline dijitPaletteImg'>" +
	"<img src='${blankGif}' alt='${alt}' title='${title}' class='dijitColorPaletteSwatch' style='background-color: ${color}'/>" +
	"</span>",

      // Template for each cell in high contrast mode.  Each cell contains an image with the whole palette,
      // but scrolled and clipped to show the correct color only
      hcTemplate: "<span class='dijitInline dijitPaletteImg' style='position: relative; overflow: hidden; height: 12px; width: 14px;'>" +
	"<img src='${image}' alt='${alt}' title='${title}' style='position: absolute; left: ${left}px; top: ${top}px; ${size}'/>" +
	"</span>",

      // _imagePaths: [protected] Map
      //		This is stores the path to the palette images used for high-contrast mode display
      _imagePaths: {
	"3x4": require.toUrl("./widgets/Scatterplot/images/colors3x4.png"),
        "7x10": require.toUrl("./widgets/Scatterplot/images/colors7x10.png")
      },
      
      constructor: function(alias, row, col, title){
	// summary:
	//		Constructor for ColorPalette._Color
	// alias: String
	//		English name of the color.
	// row: Number
	//		Vertical position in grid.
	// column: Number
	//		Horizontal position in grid.
	// title: String
	//		Localized name of the color.
	this._title = title;
	this._row = row;
	this._col = col;
        var coloralias;
        if(this.palette==="7x10"){
            coloralias = Color.named[alias];
        }else{
            coloralias = alias;
        }
	this.setColor(coloralias);
      },

      getValue: function(){
	// summary:
	//		Note that although dijit._Color is initialized with a value like "white" getValue() always
	//		returns a hex value
	return this.toHex();
      },

      fillCell: function(/*DOMNode*/ cell, /*String*/ blankGif){
	var html = string.substitute(has("highcontrast") ? this.hcTemplate : this.template, {
	  // substitution variables for normal mode
	  color: this.toHex(),
	  blankGif: blankGif,
	  alt: this._title,
	  title: this._title,
	  // variables used for high contrast mode
	  image: this._imagePaths[this.palette].toString(),
	  left: this._col * -20 - 5,
	  top: this._row * -20 - 5,
	  size: this.palette === "7x10" ? "height: 145px; width: 206px" : "height: 64px; width: 86px"
	});

	domConstruct.place(html, cell);
      }
    });
    
    return ColorPalette;
  });