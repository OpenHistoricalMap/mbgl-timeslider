// demo: rendering test bed
// data ranges -4000-2020

let START_ZOOM = 13;
let START_CENTER = [49,13.6];

const OHM_SOURCE = "osm";

const STARTING_DATE = 1850;
const DATE_RANGE = [ -4000, (new Date()).getFullYear() - 1 ];

const MAP_STYLE_URL = "https://openhistoricalmap.github.io/map-styles/rail/rail.json";

let MAP, TIMESLIDER, GLMAP_STYLE;


document.addEventListener('DOMContentLoaded', function () {
    // load the map style JSON file into the big GLMAP_STYLE constant, then proceed to set up the map
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            GLMAP_STYLE = JSON.parse(this.responseText);
            initMap();
        }
    };
    xhttp.open("GET", MAP_STYLE_URL, true);
    xhttp.send();
});


function initMap () {
    //
    // some hacks which improve the visual smoothness of the page loading
    // 1. read the hash from the URL and see if we should override the zoom and center
    // UrlHashReader does this too, but AFTER the map has loaded; setting these beforehand starts the map at the right place
    // preventing that "flash" of the default view
    // 2. go through the map style and set any TimeSlider-controlled layers to non-visible
    // then when TimeSlider comes ready and date filtering is in place, make them visible
    // that greatly reduces the flash of un-date-filtered content before the TimeSlider is effective
    //

    var hide_these_layers_until_startup = [];
    GLMAP_STYLE
    .layers
    .forEach(function (layer) {
        if (layer.source != OHM_SOURCE) return;  // not a TimeSlider-controlled layer
        if (layer.layout && layer.layout.visibility == 'none') return;  // not visible right yet, date filtering should be set up before anyone toggles this

        if (! layer.layout) layer.layout = { visibility: 'visible' };
        layer.layout.visibility = 'none';
        hide_these_layers_until_startup.push(layer.id);
    });

    //
    // the basic map and controls
    // the map style is in mapstyle.js
    //

    MAP = new mapboxgl.Map({
        container: "map",
        style: GLMAP_STYLE,
        zoom: START_ZOOM,
        center: START_CENTER
    });

    MAP.addControl(new mapboxgl.NavigationControl());

    MAP.addControl(new mapboxgl.ScaleControl({
        maxWidth: 80,
        unit: 'imperial'
    }));
    MAP.addControl(new mapboxgl.ScaleControl({
        maxWidth: 80,
        unit: 'metric'
    }));

    //
    // add our date slider in the map's load event
    //

    MAP.on('load', function () {
        TIMESLIDER = new TimeSlider.TimeSliderControl({
            // set the data source to define which layers will be filtered
            sourcename: OHM_SOURCE,
            // set the initial slider range and date selection
            date: STARTING_DATE,
            range: DATE_RANGE,
            // load an alternative CSS stylesheet and icons for the buttons
            //loadIconStyleSheet: "https://netdna.bootstrapcdn.com/bootstrap/3.0.0/css/bootstrap-glyphicons.css",
            //iconClassForward: "glyphicon glyphicon-chevron-right",
            //iconClassBack: "glyphicon glyphicon-chevron-left",
            //iconClassHome: "glyphicon glyphicon-repeat",
            //
            // this calling page can do something when the TimeSlider becomes ready and filtering is in place
            onReady: function () {
                console.log([ 'TimeSliderControl ready', this.getDate(), this.getRange()[0], this.getRange()[1] ]);

                console.log('re-enable previously hidden layers with filters already in place');
                hide_these_layers_until_startup.forEach(function (layerid) {
                    MAP.setLayoutProperty(layerid, 'visibility', 'visible');
                });
            },
            // this calling page can also take actions when the date or range are changed
            onDateSelect: function (newdate) {
                console.log([ 'date changed', newdate ]);
            },
            onRangeChange: function (newrange) {
                console.log([ 'range changed', newrange[0], newrange[1] ]);
            }
        });
        MAP.addControl(TIMESLIDER);

        //
        // and the controls which handle URL hashes
        // one to read the URL hash and apply it to the map, and that's all it does
        // one to keep reading the timeslider and the map, and update the URL hash
        //

        const urlreader = new TimeSlider.UrlHashReader({
            timeslidercontrol: TIMESLIDER,
        });
        MAP.addControl(urlreader);

        const urlwriter = new TimeSlider.UrlHashWriter({
            timeslidercontrol: TIMESLIDER,
        });
        MAP.addControl(urlwriter);
    });
}
