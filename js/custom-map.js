//Initialize the map object; Call a tile layer from openstreetmap
var map = L.map('map',{center: [42.335174, -71.078368], zoom:12, scrollWheelZoom:false});
		L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 19,
		attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
	}).addTo(map);

//Initialize the variables used to talk to Carto
var cartoDBusername = "scottmar";
var cartoDBPoints = null;
var cartoLayer = new L.layerGroup();
cartoLayer.addTo(map);
var sqlQuery = "SELECT * FROM voteforcthulhu";

var voting = null;

function setyes(){
	voting = "True";
	return voting;
	};
	
function setno(){
	voting = "False";
	return voting;
}

// Get CartoDB selection as GeoJSON and Add to Map
function getGeoJSON(){
  $.getJSON("https://"+cartoDBusername+".carto.com/api/v2/sql?format=GeoJSON&q="+sqlQuery, function(data) {
	cartoDBPoints = L.geoJson(data,{
	  pointToLayer: function(feature,latlng){
		var marker = L.marker(latlng, {icon: redIcon});
		var marker2 = L.marker(latlng, {icon: blueIcon});
		marker.bindPopup('<p><em>' + feature.properties.voteintention + '</p>');
		marker2.bindPopup('<p><em>' + feature.properties.voteintention + '</p>');
		if (feature.properties.voteintention){
			return marker;
		}
		else {return marker2};
		
	  }
	}).addTo(cartoLayer);
  });
  console.log("carto points added");
};

//Set up custom icons. Anchor at bottom and popup at center
var redIcon = L.icon({
	iconUrl: 'img/marker-red.png',	
	iconSize: [36,36],
	iconAnchor: [18,36],
	popupAnchor: [0,-18]
});
var blueIcon = L.icon({
	iconUrl: 'img/marker-icon-2x.png',
	iconSize: [36,36],
	iconAnchor: [18,36],
	popupAnchor: [0,-18]
});

// Run showAll function automatically when document loads
$( document ).ready(function() {
  getGeoJSON();
});

// refresh the layers to show the updated dataset
function refreshLayer() {
  if (map.hasLayer(cartoDBPoints)) {
	map.removeLayer(cartoDBPoints);
	console.log("Yes, had layer CartoDBPoints")
  };
  getGeoJSON();
}

//force refresh of map on window load
if(window.attachEvent) {
	window.attachEvent('onload', refreshLayer());
} else {
	if(window.onload) {
		var curronload = window.onload;
		var newonload = function(evt) {
			curronload(evt);
			refreshLayer(evt);
		};
		window.onload = newonload;
	} else {
		window.onload = refreshLayer();
	}
}

	var drawControl = new L.Control.Draw({
	    draw : {
			polygon : false,
			polyline : false,
			rectangle : false,
			circle : false,
			marker: true
		},
	  edit : false,
	  remove: false,
	  position: "topright"
	});

// Boolean global variable used to control visiblity
var controlOnMap = true;

// Create variable for Leaflet.draw features
var drawnItems = new L.FeatureGroup();

// Function to add the draw control to the map to start editing
function startEdits(){
  if(controlOnMap == true){
	map.removeControl(drawControl);
	controlOnMap = false;
  }
  map.addControl(drawControl);
  controlOnMap = true;
  console.log("map edits allowed")
};

// Function to remove the draw control from the map
function stopEdits(){
  map.removeControl(drawControl);
  controlOnMap = false;
};

// Function to run when feature is drawn on map
map.on('draw:created', function (e) {
  var layer = e.layer;
  drawnItems.addLayer(layer);
  map.addLayer(drawnItems);
  dialog.dialog("open");
  console.log("made a mark");
});


// Use the jQuery UI dialog to create a dialog and set options
var dialog = $("#dialog").dialog({
  autoOpen: false,
  height: 400,
  width: 450,
  modal: true,
  position: {
	my: "center center",
	at: "center center",
	of: "#map"
  },
  buttons: {
	"Add to Database": setData,
	Cancel: function() {
	  dialog.dialog("close");
	  map.removeLayer(drawnItems);
	  console.log("canceled");
	}
  },
  close: function() {
	form[ 0 ].reset();
	console.log("Dialog closed");
  }
});

// Stops default form submission and ensures that setData or the cancel function run
var form = dialog.find("form").on("submit", function(event) {
  event.preventDefault();
});

//sets variables to form properties, writes sql query, sends to PHP
function setData() {
	var enteredvote = voting;
	drawnItems.eachLayer(function (layer) {
		var sql = "INSERT INTO voteforcthulhu (the_geom, voteintention, latitude, longitude) VALUES (ST_SetSRID(ST_GeomFromGeoJSON('";
		var a = layer.getLatLng();
		var sql2 ='{"type":"Point","coordinates":[' + a.lng + "," + a.lat + "]}'),4326),'" + enteredvote + "','" + a.lat + "','" + a.lng +"')";
		var pURL = sql+sql2;
		submitToProxy(pURL);
		console.log(pURL + "Feature has been submitted to the Proxy");
	});
	map.removeLayer(drawnItems);
	drawnItems = new L.FeatureGroup();
	console.log("drawnItems has been cleared");
	voting = null;
	dialog.dialog("close");
};

//This version is for taking from the web form rather than the map
//UNFINISHED
//function geocode_address(){
//	var urla = "cdb_geocode_street_point("
//	search_text text, [city text], [state text], [country text])";
//	var urlb = 
//	var urlc = 
//	var url = urla + urlb + urlc;
//	var geom = 
//	return url;


// Submit data to the PHP using a jQuery Post method
var submitToProxy = function(q){
  $.post("php/callProxy.php", {
	qurl:q,
	cache: false,
	timeStamp: new Date().getTime()
  }, function(data) {
	console.log(data);
	refreshLayer();
  });
};