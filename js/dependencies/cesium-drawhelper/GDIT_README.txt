
October 1, 2014.


This is a modified version on cesium-drawhelper. Needed to create an AMD version
to work with BDA which uses the AMD version of Cesium.


1. Downloaded https://github.com/leforthomas/cesium-drawhelper
2. Created AMD directory
3. Refactored DrawHelper.js into AMD objects, see AMD folder
4. Fixed code to be "strict" javascript
    - moved embedded functions from if statements
5. Created DrawingToolbar.js in BDA to add drawhelper to BDA Cesium
