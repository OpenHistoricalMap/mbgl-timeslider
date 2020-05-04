// demo: South Bronx
// data ranges 1873-2019, but let's start with a narrower window so the user has an excuse to stretch the range
var START_ZOOM = 15;
var START_CENTER = [7.8124,48.5724];
var OHM_SOURCE = "osm";
var STARTING_DATE = 1850;
var DATE_RANGE = [ -4000, (new Date()).getFullYear() - 1 ];

// when the timeslider comes up, let's keep a reference to it so we can fetch/set it externally
var MAP, timeslider;

document.addEventListener('DOMContentLoaded', function(event) {
    //
    // some hacks which improve the visual smoothness of the page loading
    // 1. read the hash from the URL and see if we should override the zoom and center
    // UrlHashReader does this too, but AFTER the map has loaded; setting these beforehand starts the map at the right place
    // preventing that "flash" of the default view
    // 2. go through the map style and set any TimeSlider-controlled layers to non-visible
    // then when TimeSlider comes ready and date filtering is in place, make them visible
    // that greatly reduces the flash of un-date-filtered content before the TimeSlider is effective
    //

    var theregex = /^#(\d+\.?\d+)\/(\-?\d+\.\d+)\/(\-?\d+\.\d+)\//;
    var thematch = location.hash.match(theregex);
    if (thematch) {
        START_ZOOM = parseFloat(thematch[1]);
        START_CENTER = [ parseFloat(thematch[3]), parseFloat(thematch[2]) ];
    }

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
        timeslider = new TimeSlider.TimeSliderControl({
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
        MAP.addControl(timeslider);

        //
        // and the controls which handle URL hashes
        // one to read the URL hash and apply it to the map, and that's all it does
        // one to keep reading the timeslider and the map, and update the URL hash
        //

        const urlreader = new TimeSlider.UrlHashReader({
            timeslidercontrol: timeslider,
        });
        MAP.addControl(urlreader);

        const urlwriter = new TimeSlider.UrlHashWriter({
            timeslidercontrol: timeslider,
        });
        MAP.addControl(urlwriter);
    });

    //
    // example of a custom UI which can affect the TimeSliderControl
    //

    function applyExternalYear () {
        var year = document.querySelector('#whenami input').value;
        if (! year) return;

        year = parseInt(year);
        var min = year - 10;
        var max = year + 10;

        timeslider.setDate(year).setRange([ min, max ]);
    }

    document.querySelector('#whenami button').addEventListener('click', applyExternalYear);

    document.querySelector('#whenami input').addEventListener('keydown', function (event) {
        if (event.keyCode == 13) document.querySelector('#whenami button').click();
    });

    // that's it!
});
