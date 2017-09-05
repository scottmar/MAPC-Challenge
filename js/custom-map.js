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

// Get CartoDB selection as GeoJSON and Add to Map
function getGeoJSON(){
  $.getJSON("https://"+cartoDBusername+".carto.com/api/v2/sql?format=GeoJSON&q="+sqlQuery, function(data) {
	cartoDBPoints = L.geoJson(data,{
	  pointToLayer: function(feature,latlng){
		var marker = L.marker(latlng, {icon: redIcon});
		marker.bindPopup('<p><em>' + feature.properties.voteintention + '</p>');
		return marker;
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
var controlOnMap = false;

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
  height: 300,
  width: 350,
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
	var enteredvote = vote.value;
	drawnItems.eachLayer(function (layer) {
		var sql = "INSERT INTO voteforcthulhu (the_geom, vote, latitude, longitude) VALUES (ST_SetSRID(ST_GeomFromGeoJSON('";
		var a = layer.getLatLng();
		var sql2 ='{"type":"Point","coordinates":[' + a.lng + "," + a.lat + "]}'),4326),'" + enteredvote + "','" + a.lat + "','" + a.lng +"')";
		var pURL = sql+sql2;
		submitToProxy(pURL);
		console.log("Feature has been submitted to the Proxy");
	});
	map.removeLayer(drawnItems);
	drawnItems = new L.FeatureGroup();
	console.log("drawnItems has been cleared");
	dialog.dialog("close");
};

// Submit data to the PHP using a jQuery Post method
var submitToProxy = function(q){
  $.post("php/callProxy.php", { // <--- Enter the path to your callProxy.php file here
	qurl:q,
	cache: false,
	timeStamp: new Date().getTime()
  }, function(data) {
	console.log(data);
	refreshLayer();
  });
};