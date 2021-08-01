(function($) {

    function d3visualization(elem, options) {
        var self = this;

        // DEFAULT SETTINGS ... first 5 are required
		// Refer to documentation for details
        var defaults = {
			id: "",
			csvFile: "",
			yfield: "",
			xfield: "",
			numericfields: "",
			title: "",
			subtitle: "",
			width: 800,
			height: 370,
			responsive: true,
			bubbleColor: "white",
			bubbleOpacity: 0.5,
			bubbleSelected: "red",
			bubbleSelectedOpacity: 0.85,
			bubbleHoverColor: "",
			bubbleHoverBorder: "green",
			axisColor: "white",
			bubbleRadius: -1,
			minBubbleSize: 3,
			maxBubbleSize: 9,
			filters: "",
			xaxes: "",
			yaxes: "",
			reverseAxes: "",
			bgColor: "#005789",
			bgImg: "",
			bgImgPos: "top",
			padding: "10px",
			transitionDuration: 4000,
			initialSprayFrom: "",
			initialSprayXOffset: 0,
			initialSprayYOffset: 0,
			bubbleClickCallback: "",
			bubbleFilterCallback: "",
			axisFormats: "",
			tooltipTemplate: "",
			tooltipOffsetX: -70,
			tooltipOffsetY: 10
        };
		
        self.options = $.extend({}, defaults, options);	// mix in the passed-in options with the default options

		// Create variables
		var appliedFilterValue = "";
		var cArray = [];
		var csvCols;
		var yaxe = self.options.yfield;
		var xaxe = self.options.xfield;
		var scaleY, scaleX, x_axis, y_axis;
		
		var axisFormatsArray = [];
		if (self.options.axisFormats != "") {
			axisFormatsArray = (self.options.axisFormats).split("~");
		}

		// This function is related with scaling the size of a bubble based on original data value in CSV file
		function scaleIt(num, in_min, in_max, out_min, out_max) {
			return (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
		}

		// Append SVG
		var svg = d3.select("#" + self.options.id)
			.append("svg")
				.style("background-color", self.options.bgColor)
				.attr("width", self.options.width)
				.attr("height", self.options.height);

		// Apply various options (if specified)
		if (self.options.responsive) {
			$("#" + self.options.id + " svg").attr("viewBox", "0 0 " + self.options.width + " " + self.options.height).attr("preserveAspectRatio", "xMidYMid meet");
		}

		if (self.options.bgImg != "") {
			$("#" + self.options.id + " svg").css("background-image","url(" + self.options.bgImg + ")");
			if (self.options.bgImgPos != "") {
				$("#" + self.options.id + " svg").css("background-position", self.options.bgImgPos);
			}
		}

		if (self.options.bubbleHoverColor != "") {
			var tmpstyle = "<style>#" + self.options.id + " svg circle:hover { fill:" + self.options.bubbleHoverColor + " !important; opacity: 1 !important; }</style>";
			$("body").append(tmpstyle);
		}
		if (self.options.bubbleHoverBorder != "") {
			var tmpstyle = "<style>#" + self.options.id + " svg circle:hover { stroke:" + self.options.bubbleHoverBorder + " !important; opacity: 1 !important; }</style>";
			$("body").append(tmpstyle);
		}
		if (self.options.padding != "") {
			$("#" + self.options.id + " svg").css("padding", self.options.padding);
		}

		// Main function that loads CSV data file and draws data visualization
		function drawViz() {
			var reverseAxisArray;
			var sortNumeric = false;
			d3.csv(self.options.csvFile)
				.then(function(data) {	
					if (self.options.numericfields != "") {
						var nfieldsArray = (self.options.numericfields).split("~");
						data.forEach(function(d) {
							for (var k = 0; k < nfieldsArray.length; k++) {
								d[nfieldsArray[k]] = +d[nfieldsArray[k]];
							}
						});
					}
					cArray = data;

					if (self.options.fileFormat == "csv") {
						csvCols = data.columns;
					} else {
						csvCols = d3.keys(data[0]);
					}

					// Y scale				
					var tmpDomain = d3.extent(data, function(d) { return d[yaxe]; });
					if (self.options.reverseAxes != "") {
						reverseAxisArray = (self.options.reverseAxes).split("~");
						for (var k = 0; k < reverseAxisArray.length; k++) {
							if (yaxe == reverseAxisArray[k]) {
								tmpDomain = tmpDomain.reverse();
								break;
							}
						}
					}
					scaleY = d3.scaleLinear()
						.domain(tmpDomain)
						.range([self.options.height-50, 0]);
					
					// X scale				
					tmpDomain = d3.extent(data, function(d) { return d[xaxe]; });
					if (self.options.reverseAxes != "") {
						reverseAxisArray = (self.options.reverseAxes).split("~");
						for (var k = 0; k < reverseAxisArray.length; k++) {
							if (xaxe == reverseAxisArray[k]) {
								tmpDomain = tmpDomain.reverse();
								break;
							}
						}
					}
					scaleX = d3.scaleLinear()
						.domain(tmpDomain)
						.range([63, self.options.width-20]);

					var tmpformat, tmpArray;
					var tmpFormatDetailsArr = [];
				
					// add scales to axis
					x_axis = d3.axisBottom()
						.tickFormat( function(d) { 
							if (self.options.axisFormats == "") {
								return d;
							} else {
								for (let k = 0; k < axisFormatsArray.length; k++) {
									tmpArray = axisFormatsArray[k].split("::");
									tmpFormatDetailsArr = (tmpArray[1]).split("^");
									if (xaxe == tmpArray[0]) {
										if (tmpFormatDetailsArr.length == 4) {	// d1000 = divide by 1000
											return tmpFormatDetailsArr[0] + d3.format(tmpFormatDetailsArr[1])(d/1000) + tmpFormatDetailsArr[2];
										} else {
											return tmpFormatDetailsArr[0] + d3.format(tmpFormatDetailsArr[1])(d) + tmpFormatDetailsArr[2];
										}
										break;
									}
								}
								return d;
							}
						})
						.scale(scaleX);

					// Add axes
					svg.append("g")
						.attr("transform", "translate(0," + (self.options.height-40) + ")")
						.attr("class", "xTicks")
						.call(x_axis);

					y_axis = d3.axisLeft()
						.tickFormat( function(d) { 
							if (self.options.axisFormats == "") {
								return d;
							} else {
								for (let k = 0; k < axisFormatsArray.length; k++) {
									tmpArray = axisFormatsArray[k].split("::");
									tmpFormatDetailsArr = (tmpArray[1]).split("^");
									if (yaxe == tmpArray[0]) {
										if (tmpFormatDetailsArr.length == 4) {	// d1000 = divide by 1000
											return tmpFormatDetailsArr[0] + d3.format(tmpFormatDetailsArr[1])(d/1000) + tmpFormatDetailsArr[2];
										} else {
											return tmpFormatDetailsArr[0] + d3.format(tmpFormatDetailsArr[1])(d) + tmpFormatDetailsArr[2];
										}
										break;
									}
								}
								return d;
							}
						})
						.scale(scaleY);

					svg.append("g")
						.attr("transform", "translate(63, 10)")
						.attr("class", "yTicks")
						.call(y_axis);
						
					svg.append("text")	// initial Y axis label
						.text(self.options.yfield)
						.style("fill", self.options.axisColor)
						.attr("id","yLabel")
						.attr("transform", "rotate(-90)")
						.style("text-anchor", "middle")
						.attr("x",0 - (self.options.height / 2))
						.attr("y","10");
						
					svg.append("text")	// initial X axis label
						.text(self.options.xfield)
						.style("fill", self.options.axisColor)
						.attr("id","xLabel")
						.style("text-anchor", "middle")
						.attr("transform", "translate(" + (self.options.width / 2) + " ," + (self.options.height - 3) + ")");

					$("#" + self.options.id + " line").css("stroke", self.options.axisColor);
					$("#" + self.options.id + " text").css("fill", self.options.axisColor);
					$("#" + self.options.id + " path").css("stroke", self.options.axisColor);

					// Add X and Y PLOT dropdowns that user can toggle between
					if (self.options.yaxes != "") {
						var tmpAxisArray = (self.options.yaxes).split("~");
						var tmpplot = "";
						var selectedx = "";
						if (tmpAxisArray.length > 1) {
							tmpplot = "<div class='axisContainer'><img class='axisIcon' src='images/yaxis.png' alt='Y axis'><select class='axisSelect' data-placeholder='' id='" + self.options.id + "_selectYAxis' tabindex='1'>";
							for (var k = 0; k < tmpAxisArray.length; k++) {
								if (yaxe == tmpAxisArray[k]) { selectedx = " selected"; } 
								else { selectedx = ""; }
								tmpplot = tmpplot + "<option value='" + tmpAxisArray[k] + "'" + selectedx + ">" + tmpAxisArray[k] + "</option>";
							}
							tmpplot = tmpplot + "</select></div>";
						}
						
						tmpAxisArray = (self.options.xaxes).split("~");
						if (tmpAxisArray.length > 1) {
							tmpplot = tmpplot + "<div class='axisContainer'><img class='axisIcon' src='images/xaxis.png' alt='X axis'><select class='axisSelect' data-placeholder='' id='" + self.options.id + "_selectXAxis' tabindex='1'>";
							for (var k = 0; k < tmpAxisArray.length; k++) {
								if (xaxe == tmpAxisArray[k]) { selectedx = " selected"; } 
								else { selectedx = ""; }
								tmpplot = tmpplot + "<option value='" + tmpAxisArray[k] + "'" + selectedx + ">" + tmpAxisArray[k] + "</option>";
							}
							tmpplot = tmpplot + "</select></div>";
						}
						
						if (tmpplot != "") {
							tmpplot = "<div id='selectAxesRow'><span class='plotLabel'>PLOT:</span>" + tmpplot + "</div>";
							$("#" + self.options.id).append(tmpplot);
							$("#" + self.options.id + "_selectYAxis").on('change', function(evt, params) {
								yaxe = this.value;
								axisChange();
							});
							$("#" + self.options.id + "_selectXAxis").on('change', function(evt, params) {
								xaxe = this.value;
								axisChange();
							});
						}
					}

					// Call function to plot all data points
					plotAllDots();

					// Take action based on user options
					if (self.options.filters != "") {
						createFilters();
					}
					if (self.options.subtitle !== "") {
						$("#" + self.options.id).prepend("<div class='vizSubtitle'>" + self.options.subtitle + "</div>");
					}
					if (self.options.title !== "") {
						$("#" + self.options.id).prepend("<h2 class='vizHdr'>" + self.options.title + "</h2>");
					}
					
					function plotAllDots() {
						var ttip = d3.select("#" + self.options.id).append("div")
							.attr("id", self.options.id + "_ttip")
							.attr("class", "tooltip")
							.style("opacity", 0);
							
						var circles = svg.selectAll("#" + self.options.id + " circle")
							.data(cArray)
							.enter()
								.append("circle");
						
						var tmpmaxY = d3.max(data, function(d) { return d[yaxe]; });
						var filterListArray = (self.options.filters).split("~");
						
						var initx = 0;
						var inity = 0;
						if (self.options.initialSprayFrom != "") {
							self.options.initialSprayFrom = (self.options.initialSprayFrom).toUpperCase();
							var minx = d3.min(data, function(d) { return d[xaxe]; });
							var maxx = d3.max(data, function(d) { return d[xaxe]; });
							var miny = d3.min(data, function(d) { return d[yaxe]; });
							var maxy = d3.max(data, function(d) { return d[yaxe]; });
							if (self.options.initialSprayFrom == "N") {
								initx = (minx + maxx) / 2;
								inity = maxy;
							} else if (self.options.initialSprayFrom == "S") {
								initx = (minx + maxx) / 2;
								inity = miny;
							} else if (self.options.initialSprayFrom == "E") {
								initx = maxx;
								inity = (miny + maxy) / 2;
							} else if (self.options.initialSprayFrom == "W") {
								initx = minx;
								inity = (miny + maxy) / 2;
							} else if (self.options.initialSprayFrom == "NE") {
								initx = maxx;
								inity = maxy;
							} else if (self.options.initialSprayFrom == "SE") {
								initx = maxx;
								inity = miny;
							} else if (self.options.initialSprayFrom == "NW") {
								initx = minx;
								inity = maxy;
							} else {	// SW for Southwest (or user entered typo)
								initx = minx;
								inity = miny;
							}
							
							if (self.options.initialSprayXOffset != 0) {
								initx = initx + self.options.initialSprayXOffset;
							}
							if (self.options.initialSprayYOffset != 0) {
								inity = inity + self.options.initialSprayYOffset;
							}
						}

						var circleAttributes = circles
							.attr("cx", function (d) { return scaleX(initx); })
							.attr("cy", function (d) { return scaleY(inity) + 10; })
							.attr("r", function (d) {
								if (self.options.bubbleRadius > -1) {
									return self.options.bubbleRadius;
								} else {
									return scaleIt(d[yaxe], 1, tmpmaxY, self.options.minBubbleSize, self.options.maxBubbleSize);
								}
							})
							.attr("data", function (d) { 
								var datax = "~";
								var tmpstr;
								for (var k = 0; k < filterListArray.length; k++) {
									tmpstr = d[filterListArray[k]] + "";	// handle apostrophes
									if (tmpstr != "") {
										if (tmpstr.indexOf("'") > -1) {
											datax = datax + tmpstr.replace(/\'/g,"&apos;") + "~";
										} else {
											datax = datax + d[filterListArray[k]] + "~";
										}
									} else {
										datax = datax + d[filterListArray[k]] + "~";
									}
								}
								return datax;
							})
							.style("fill", function (d) { 
								if (d[yaxe] == "" || d[xaxe] == "") {	// some data is null
									return "transparent";
								} else {
									return self.options.bubbleColor;
								}
							})							
							.style("opacity", self.options.bubbleOpacity)
							.on("mouseover", function(d) {					// MOUSEOVER TOOLTIP
								ttip.transition()
									.duration(200)
									.style("opacity", 1);
								ttip.html(getTooltipData(d,filterListArray))
									.style("left", function () {
										return (d3.event.pageX + 8 + self.options.tooltipOffsetX) + "px";
									})
									.style("top", function () {
										return (d3.event.pageY + 8 + self.options.tooltipOffsetY) + "px";
									});
								})					
							.on("mouseout", function(d) {
								ttip.transition()
									.duration(500)
									.style("opacity", 0);
							});
							
							$("#" + self.options.id + " circle").click(function() {	// XXX
								$("#" + self.options.id + " circle").removeAttr("hilited");
								clearAllDots();
								$("#" + self.options.id + " .filterRow select").val('all');

								d3.select(this)
									.attr("hilited","1")
									.raise()
									.transition().duration(600).ease(d3.easePoly)
									.style("fill", self.options.bubbleSelected)
									.style("opacity", self.options.bubbleSelectedOpacity);
							
								if (self.options.bubbleClickCallback != "") {
									// console.log(d3.select(this).data());
									window[self.options.bubbleClickCallback](d3.select(this).data());
								}
						});

						svg.selectAll("#" + self.options.id + " circle")
							.transition().duration(self.options.transitionDuration).ease(d3.easePoly)
							.attr("cx", function (d) { return scaleX(d[xaxe]); })
							.attr("cy", function (d) { return scaleY(d[yaxe]) + 10; });
							
						// remove tooltip DIV if there is no tooltip template and no filters
						if (self.options.tooltipTemplate == "" && self.options.filters == "") {
							$("#" + self.options.id + "_ttip").remove();
						}							
					}
					
					// Retrieve and create tooltip (both default and custom)
					function getTooltipData(inData,inArray) {						
						var datax = "";
						if (self.options.tooltipTemplate == "") {	// default tooltip displays filter values
							for (var k = 0; k < inArray.length; k++) {
								if (datax == "") {
									datax = inData[inArray[k]] + "<br/>";
								} else {
									datax = datax + inData[inArray[k]] + "<br/>";
								}
							}
						} else {
							datax = self.options.tooltipTemplate;
							var replacex, re;
							var flagfound = false;
							for (var k = 0; k < csvCols.length; k++) {
								replacex = "{" + csvCols[k] + "}";
								re = new RegExp(replacex,"g");
								flagfound = false;
								// if a numeric column, then format it with commas
								if (self.options.numericfields != "") {
									for (var z = 0; z < nfieldsArray.length; z++) {
										if (nfieldsArray[z] == csvCols[k]) {	// then a numeric field
											flagfound = true;
											break;
										}
									}
								}

								if (inData[csvCols[k]] == "") {	// handle missing data ... return dash
									datax = datax.replace(re, " &ndash; ");
								} else if (flagfound && (csvCols[k]).toLowerCase() != "year") {
									datax = datax.replace(re, numberWithCommas(inData[csvCols[k]]));
								} else {
									datax = datax.replace(re, inData[csvCols[k]]);
								}
							}
						}
						datax = datax.replace("$-","-$");
						return datax;
					}
					

					function clearAllDots() {	// clear all visible dots (some dots are transparent because of missing data)
						appliedFilterValue = "";
						svg.selectAll("#" + self.options.id + " circle")
							.style("fill", function (d) { 
								if (d[yaxe] == "" || d[xaxe] == "") {
									return "transparent";
								} else {
									return self.options.bubbleColor;
								}
							})
							.style("opacity", self.options.bubbleOpacity);
					}


					// User has requested a change in the X or Y axis
					function axisChange() {
						var tmpval;
						$("#" + self.options.id + " g.yTicks .tick").remove();
						$("#" + self.options.id + " g.xTicks .tick").remove();

						// CHANGE Y-AXIS
						$("#" + self.options.id + " text#yLabel").text(yaxe);
						
						// Y scale				
						var tmpDomain = d3.extent(cArray, function(d) { return d[yaxe]; });
						if (self.options.reverseAxes != "") {
							reverseAxisArray = (self.options.reverseAxes).split("~");
							for (var k = 0; k < reverseAxisArray.length; k++) {
								if (yaxe == reverseAxisArray[k]) {
									tmpDomain = tmpDomain.reverse();
									break;
								}
							}
						}
						scaleY = d3.scaleLinear()
							.domain(tmpDomain)
							.range([self.options.height-50, 0]);					

						y_axis = d3.axisLeft()
							.tickFormat( function(d) { 
								if (self.options.axisFormats == "") {
									return d;
								} else {
									for (let k = 0; k < axisFormatsArray.length; k++) {
										tmpArray = axisFormatsArray[k].split("::");
										tmpFormatDetailsArr = (tmpArray[1]).split("^");
										if (yaxe == tmpArray[0]) {
											if (tmpFormatDetailsArr.length == 4) {	// d1000 = divide by 1000
												return tmpFormatDetailsArr[0] + d3.format(tmpFormatDetailsArr[1])(d/1000) + tmpFormatDetailsArr[2];
											} else {
												return tmpFormatDetailsArr[0] + d3.format(tmpFormatDetailsArr[1])(d) + tmpFormatDetailsArr[2];
											}
											break;
										}
									}
									return d;
								}
							})
							.scale(scaleY);
						svg.append("g")
							.attr("transform", "translate(63, 10)")
							.attr("class", "yTicks")
							.call(y_axis);
							
						// CHANGE X-AXIS
						$("#" + self.options.id + " text#xLabel").text(xaxe);
						
						// X scale				
						tmpDomain = d3.extent(cArray, function(d) { return d[xaxe]; });
						if (self.options.reverseAxes != "") {
							reverseAxisArray = (self.options.reverseAxes).split("~");
							for (var k = 0; k < reverseAxisArray.length; k++) {
								if (xaxe == reverseAxisArray[k]) {
									tmpDomain = tmpDomain.reverse();
									break;
								}
							}
						}
						scaleX = d3.scaleLinear()
							.domain(tmpDomain)
							.range([63, self.options.width-20]);
					
						var x_axis = d3.axisBottom()
							.ticks(12)
							.tickFormat( function(d) { 
								if (self.options.axisFormats == "") {
									return d;
								} else {
									for (let k = 0; k < axisFormatsArray.length; k++) {
										tmpArray = axisFormatsArray[k].split("::");
										tmpFormatDetailsArr = (tmpArray[1]).split("^");
										if (xaxe == tmpArray[0]) {
											if (tmpFormatDetailsArr.length == 4) {	// d1000 = divide by 1000
												return tmpFormatDetailsArr[0] + d3.format(tmpFormatDetailsArr[1])(d/1000) + tmpFormatDetailsArr[2];
											} else {
												return tmpFormatDetailsArr[0] + d3.format(tmpFormatDetailsArr[1])(d) + tmpFormatDetailsArr[2];
											}
											break;
										}
									}
									return d;
								}
							})
							.scale(scaleX);
							
						// Append group and insert axis
						svg.append("g")
							.attr("transform", "translate(0," + (self.options.height-40) + ")")
							.attr("class", "xTicks")
							.call(x_axis);
						
						// Apply colors
						$("#" + self.options.id + " line").css("stroke", self.options.axisColor);
						$("#" + self.options.id + " text").css("fill", self.options.axisColor);
						$("#" + self.options.id + " path").css("stroke", self.options.axisColor);

						var tmp;
						
						// Move circles into place
						svg.selectAll("#" + self.options.id + " circle")
							.transition().duration(self.options.transitionDuration).ease(d3.easePoly)
							.attr("cy", function (d) { return scaleY(d[yaxe]) + 10; })
							.attr("cx", function (d) { return scaleX(d[xaxe]); })
							.style("fill", function (d) { 
								if (d[yaxe] == "" || d[xaxe] == "") {
									return "transparent";
								} else {
									if ($(this).attr("hilited") == "1") {
										return self.options.bubbleSelected;
									} else if (appliedFilterValue != "") {
										tmp = $(this).attr("data");
										if (tmp.indexOf("~" + appliedFilterValue + "~") > -1) {
											return self.options.bubbleSelected;
										} else {
											return self.options.bubbleColor;
										}
									} else {
										return self.options.bubbleColor;
									}
								}
							});
					}

					
					// Function that converts number to string and adds commas
					function numberWithCommas(x) {
						return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
					}
					

					// Create filter dropdowns 
					function createFilters() {
						var filterList = (self.options.filters).split("~");
						var outx = "";

						for (var k = (filterList.length-1); k >= 0; k--) {
							outx = "<select class='filterDrop' id='" + self.options.id + "_filter" + k + "' data='" + filterList[k] + "'></select>";
							$("#" + self.options.id).prepend(outx);

							// attach event listener to dropdown
							$("select#" + self.options.id + "_filter" + k).on('change', function(evt, params) {
								applyFilter(self.options.id, this.id, this.value);
							});
							
							// populate dropdown with unique values
							d3.select("select#" + self.options.id + "_filter" + k).selectAll("option")
								.data(d3.map(data, function(d){return d[filterList[k]];}).keys())
								.enter()
								.append("option")
								.text(function(d){ return d; })
								.attr("value", function(d){ 
									if (d.indexOf("'") > -1) {
										var tmpval = d.replace(/\'/g,"&apos;");
										return tmpval;
									} else { 
										return d; 
									}
								});

							// Sort dropdown options in the DOM
							sortNumeric = false;
							for (var z = 0; z < nfieldsArray.length; z++) {
								if (filterList[k] == nfieldsArray[z]) {
									sortNumeric = true;
								}
							}
							var options = $("select#" + self.options.id + "_filter" + k + " option");
							var arr = options.map(function(_, o) { return { t: $(o).text(), v: o.value }; }).get();
							if (sortNumeric == true) {
								arr.sort(function(o1, o2) { return parseFloat(o1.t) > parseFloat(o2.t) ? 1 : parseFloat(o1.t) < parseFloat(o2.t) ? -1 : 0; });
							} else {
								arr.sort(function(o1, o2) { return o1.t > o2.t ? 1 : o1.t < o2.t ? -1 : 0; });
							}
							options.each(function(i, o) {
								o.value = arr[i].v;
								$(o).text(arr[i].t);
							});
							
							// Inject 'all' option to a filter dropdown
							$("select#" + self.options.id + "_filter" + k).prepend("<option value='all' selected>" + (filterList[k]).toUpperCase() + "</option>");
						}
						
						$("#" + self.options.id + " select.filterDrop").wrapAll("<div id='" + self.options.id + "_filterRow' class='filterRow' />");
					}

					// user clicks back of SVG
					$("#" + self.options.id + " svg").click(function(e) {
						if (e.target !== this)
							return;
						clearAllDots();
						$("#" + self.options.id + " circle").removeAttr("hilited");
						var filterList2 = (self.options.filters).split("~");
						if (filterList2.length > 1) {
							for (var k = 0; k < filterList2.length; k++) {
								$("select#" + self.options.id + "_filter" + k).val('all');
							}
							$("#" + self.options.id + " select").trigger("chosen:updated");
						}
					});

				})
				.catch(function(error){		// error message if problem loading data file
					if (error == "TypeError: Failed to fetch") {
						$("#" + self.options.id).html("<p class='loadErrorMsg'>Error reading data<br/><br/>Details of the error:<br><strong>" + error + "</strong>");
					} else {
						$("#" + self.options.id).html("<p class='loadErrorMsg'>Error reading data<br/><br/>Details of the error:<br><strong>" + error + "</strong>");
					}
				});

		}

		drawViz();

		// This function applies a filter
		function applyFilter (inViz, inFilterId, inValue) {	
			var tmpFilterNum = parseInt(inFilterId.slice(11));
			var filterList = (self.options.filters).split("~");

			appliedFilterValue = inValue;
			
			// reset other filters (if there are others)
			if (filterList.length > 1) {
				for (var k = 0; k < filterList.length; k++) {
					if (k != tmpFilterNum) {
						$("select#" + self.options.id + "_filter" + k).val('all');
					}
				}
			}
			$("#" + self.options.id + " select").trigger("chosen:updated");
			$("#" + self.options.id + " circle").removeAttr("hilited");
				
			d3.selectAll("#" + inViz + " circle")
				.style("fill", function (d) { 
					if (d[yaxe] == "" || d[xaxe] == "") {
						return "transparent";
					} else {
						return self.options.bubbleColor;
					}
				})
				.style("opacity", self.options.bubbleOpacity);
			
			$("#" + inViz + " circle[data*='~" + inValue + "~']").attr("hilited","1");
			
			d3.selectAll("#" + inViz + " circle[data*='~" + inValue + "~']")
				.raise()
				.transition().duration(600).ease(d3.easePoly)
				.style("fill", self.options.bubbleSelected)
				.style("opacity", self.options.bubbleSelectedOpacity);	// was 1

			if (self.options.bubbleFilterCallback != "") {
				// console.log(d3.selectAll("#" + inViz + " circle[data*='~" + inValue + "~']").data());
				window[self.options.bubbleFilterCallback](d3.selectAll("#" + inViz + " circle[data*='~" + inValue + "~']").data());
			}
				
		}
		
		if (self.options.responsive) {
			var chart = $("#" + self.options.id + " svg"),
				aspect = chart.width() / chart.height(),
				container = chart.parent();

			$(window).on("resize", function() {
				var tmpPaddingWidth = (parseInt($("#" + self.options.id + " svg").css("padding-left")) + parseInt($("#" + self.options.id + " svg").css("padding-right")));
				var targetWidth = container.width() - tmpPaddingWidth;
				chart.attr("width", targetWidth);
				chart.attr("height", Math.round(targetWidth / aspect));
			}).trigger("resize");
		}

	}

    // Attach plugin to jQuery namespace
    $.fn.GraphObj = function(options) {
        return this.each(function() {
            // Prevent multiple instances
            if (!$(this).data('GraphObj'))
                $(this).data('GraphObj', new d3visualization(this, options));
        });
    };
})(jQuery);
