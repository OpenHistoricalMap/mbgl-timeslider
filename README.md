# Open Historical Map: TimeSlider Control for Mapbox GL JS API

This code was originally created as part of a set of map demos in this repo: https://github.com/Open-Historical-Map-Labs/openhistoricaltiles/tree/gh-pages

This new repo extracts just the timeslider for further development and ongoing use in production OHM.

The `demo/` folder contains a working demo of a OpenHistoricalMap basemap working with this TimeSliderControl.

## Usage

1. Create a MBGL map as usual.

2. Include the SCRIPT and LINK tags for the control:
```
<script src="dist/mbgl-control-timeslider.js"></script>
<link rel="stylesheet" href="dist/mbgl-control-timeslider.css" />
```

3. Add the control to your MBGL map, configuring which data source should have its layers filtered. That is, specify which of the `sources` in your map style, is the OpenHistoricaMap's vector tile service at https://vtiles.openhistoricalmap.org/. This should be done after your map's `load` event has fired, like this:
```
var dateslider;

MAP.on('load', function () {
    dateslider = new TimeSlider.TimeSliderControl({
        sourcename: "ohm-data",     // required
        date: 1850,
        range: [1800, 2000],
        datelimit: [1600, 2100],
        onDateSelect: function (newdate) {
            console.log([ 'date changed', newdate ]);
        },
        onRangeChange: function (newrange) {
            console.log([ 'range changed', newrange[0], newrange[1] ]);
        }
    });
    MAP.addControl(dateslider);
});
```


## Config Options

`sourcename` -- **Required.** The name of the data source, as defined in your map style's `sources`, which should have its layers filtered by this TimeSliderControl. All layers from this source will be presumed to be OpenHistoricalMap (or to be compatible, by virtue of all features having `start_date` and `end_date` properties) and will be filtered.)

`date` -- The initially-selected date when the TimeSliderControl UI first appears. This should be within the range specified by `range`. If omitted, this will be set to the first year of the `range`.

`range` -- The initial range of dates offered by the TimeSliderControl UI when it first appears. This is provided as an array of two numbers, e.g. `[1800, 2000]` If omitted, the range will be set to the last 100 years from the current date (that is, `[ currentyear-100, currentyear]`).

`datelimit` -- A hard limit on the minimum and maximum dates to which the UI may be adjusted. If omitted, this defaults to the same as `range`. If a `range` is also supplied, it should fall wholly within this `datelimit`.

`autoExpandRange` -- By default `autoExpandRange` is true, so that the + and - buttons will automagically expand the current date range to accommodate the new year. Set this to false, to lock the + and - buttons to the currently-selected range, so the user would need to explicitly change the range in order to +/- past it.

`onDateSelect` -- A callback function which will be called when the date selection changes. The newly-selected date will be passed as a param. Within the callback function, `this` will refer to the TimeSliderControl.

`onRangeChange` -- A callback function which will be called when the date range changes. The newly-available range will be passed as a param. Within the callback function, `this` will refer to the TimeSliderControl.

`onReady` -- A callback function which will be called when the TimeSliderControl is done initializing, layers have been set up with their new date filters, and the date ranges and selection have been set. Within the callback function, `this` will refer to the TimeSliderControl.

`loadIconStyleSheet` -- The URL of a stylesheet which provides CSS classes for making icons. If not set, then by default a recent FontAwesome Free release is used. Use this in conjunction with `iconClassForward`, `iconClassBack`, `iconClassHome`, etc. If you set this to an empty value or null, then no stylesheet will be loaded and you will need to provide relevant CSS or icon classes elsewhere.

`iconClassForward` -- For the UI buttons, the CSS class to apply to the Forward button which advances to the next date. By default this is `fa fa-plus` to make a plus sign using FontAwesome.

`iconClassBack` -- For the UI buttons, the CSS class to apply to the Back button which advances to the previous date. By default this is `fa fa-minus` to make a minus sign using FontAwesome.

`iconClassHome` -- For the UI buttons, the CSS class to apply to the Home button which returns the slider to the original starting date. By default this is `fa fa-home` to make a home/house using FontAwesome.



## Methods

* `getDate()` -- Get the currently-selected date. Returns the date, e.g. `2025`

* `setDate(year)` -- Set the slider to the given date and perform filtering. If the date is outside of the current range, the range will be extended

* `yearForward(howmany=1)` -- A convenience function, to move the time forward by a number of years (if not given, default is 1).

* `yearBack(howmany=1)` -- A convenience function, to move the time backward by a number of years (if not given, default is 1).

* `getRange()` -- Get the currently visible date range in the UI. Returns a two-item array of dates, e.g. `[1850, 1950]`

* `setRange([ year, year ])` -- Set the slider's new range. This will respect the `datelimit` limitations. If the new date range would not include the currently-selected date (`getDate()`) then the range will be extended to include the currently-selected date before it is applied, so the currently-selected date will still be within range. If you want to set the range to one which does not contain the currently-selected date, you should use `setDate()` first and then use `setRange()`.

* `setRangeUpper(year)` -- A convenience function, to call `setRange()` specifying only the upper end of the new range. The lower end will be kept at the current setting.

* `setRangeLower(year)` -- A convenience function, to call `setRange()` specifying only the lower end of the new range. The lower end will be kept at the current setting.

* `getLimit()` -- Return the date range limit specified by `datelimit`. Returns a two-item array of dates, e.g. `[1800, 2000]`

* `isDateWithinRange(year)` -- Return true or false, indicating whether the given date is within the currently offered range in the UI.

* `isDateWithinLimit(year)` -- Return true or false, indicating whether the given date is within the `datelimit` limitations and thus could be legal for `setDate()` et al.



## Additional Tools: UrlHashReader and UrlHashWriter

People have become accustomed to having the map state reflected in the URL hash as they change it, and for page loading to implicitly include loading the URL hash into the starting map view.

To facilitate this behavior in your application, we provide `UrlHashReader` and `UrlHashWriter`

### UrlHashReader

The `UrlHashReader` control, when added to your map, will do one thing: read and apply the URL hash params.

The expected URL hash would be structured like this example: `#16.6/40.8217108/-73.9119449/1980,1970-2000`
* The zoom level, which may be integer or fractional.
* The latitude of the starting map view's center.
* The longitude of the starting map view's center.
* The TimeSliderControl settings: the selected date, then the range.

The UrlHashReader has only one constructor option: `timeslidercontrol` which points to the TimeSliderControl that it should set.

```
const urlreader = new TimeSlider.UrlHashReader({
    timeslidercontrol: timeslider,
});
MAP.addControl(urlreader);
```

After it has set the map view and TimeSliderControl date and range, the `TimeSlider.URLHashReader` control has no other effect, and has no visible user interface.

### UrlHashWriter

The `UrlHashWriter` control continuously tracks changes to the map view and/or to the TimeSliderControl settings, and updates the URL hash in the address bar. When used in conjunction with `UrlHashReader`, the effect is that one may reload the page and automagically have their previous view applied on page load.

The UrlHashWriter has only one constructor option: `timeslidercontrol` which points to the TimeSliderControl that it should be tracking.

```
const urlwriter = new TimeSlider.UrlHashWriter({
    timeslidercontrol: timeslider,
});
MAP.addControl(urlwriter);
```

The `UrlHashWriter` has no visible UI control. It will stop updating the URL if it is removed from the map via `MAP.removeControl()`


## For Developers

Babel, SASS/SCSS, Webpack.

Most edits would be made to these files:
* `mbgl-control-timeslider-control.js` -- the widget's JavaScript source code
* `mbgl-control-timeslider-control.scss` -- the widget's SASS stylesheet

Commands of note:
* `nvm install && nvm use && yarn install` -- first-time project setup to set up the proper version of Node and the dependencies; you probably only need to do this the first time you set up, after you `git clone` the repo
* `nvm use && npm run serve` -- select the right Node, then start up a web server and a new browser window; use this in conjunction with `npm run watch` for your day-to-day work
* `npm run build` -- compile the control for distribution and use in other browsers and sites; output goes into the `dist/` folder
* `npm run watch` -- watches for changes to the files listed above, automagically running `npm run build` for you when they are changed

The `dist/` folder is kept in version control, so the ready-to-use control will be readily available on Github.
