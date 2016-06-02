
/**********************************************************************************************/
function getStyleSheetPropertyValue(selectorText, propertyName) {
	// search backwards because the last match is more likely the right one
	for (var s = document.styleSheets.length - 1; s >= 0; s--) {
		var cssRules = document.styleSheets[s].cssRules || document.styleSheets[s].rules || []; // IE support

		for (var c = 0; c < cssRules.length; c++) {
			if (cssRules[c].selectorText === selectorText) {
				return cssRules[c].style[propertyName];
			}
		}
	}

	return null;
}

/**********************************************************************************************/
function parsePixelLength(pixelLength) {
	if (pixelLength.length >= 3) {
		var formated = pixelLength.substr(0, pixelLength.length - 2);

		return parseInt(formated, 10);
	}

	return 0;
}
