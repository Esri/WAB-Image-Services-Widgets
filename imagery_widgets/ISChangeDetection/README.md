## IS ChangeDetection ##
### Overview ###
IS ChangeDetection widget allows user to detect the difference between 2 rasters on the primary layer and secondary layer. The change is remapped to one color and the rest is remapped to another color. The result is shown as a new layer called “Result Layer”.
For change detection widget to function, following workflow should be followed – 
*	On the primary layer, go to the IS timeFilter widget and activate it. After activating select the scene for which you want to do change detection. 
* Go back to the IS Layers widget and click on the ‘copy primary to secondary’ button. The current primary layer with the scene you selected becomes the secondary layer.
*	Go back to the IS timeFilter widget and select the new scene for which the change detection will be performed.
*	Open IS ChangeDetection widget. Choose the method and click on apply.
