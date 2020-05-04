require('./mbgl-control-timeslider-control.scss');

require('./mbgl-control-timeslider-polyfills.js');


export class TimeSliderControl {
    constructor (options={}) {
        // merge suppplied options with these defaults
        const current_year = (new Date()).getFullYear();

        this.options = Object.assign({
            sourcename: undefined,
            range: [ current_year - 100, current_year],
            autoExpandRange: true,
            date: undefined, // derived from range
            datelimit: undefined, // derived from range
            onDateSelect: function () {},
            onRangeChange: function () {},
            onReady: function () {},
            loadIconStyleSheet: "https://use.fontawesome.com/releases/v5.8.1/css/all.css",
            iconClassForward: 'fa fa-plus',
            iconClassBack: 'fa fa-minus',
        }, options);

        if (! this.options.date) {
            this.options.date = this.options.range[0];
        }
        if (! this.options.datelimit) {
            this.options.datelimit = this.options.range.slice();  // same as the given range
        }

        // preliminary sanity checks
        if (! this.options.sourcename) throw `TimeSliderControl missing required option: sourcename`;
        if (! Number.isInteger(this.options.date)) throw `TimeSliderControl option date is not an integer`;
        if (! Number.isInteger(this.options.range[0])) throw `TimeSliderControl option range is not two integers`;
        if (! Number.isInteger(this.options.range[1])) throw `TimeSliderControl option range is not two integers`;
        if (! Number.isInteger(this.options.datelimit[0])) throw `TimeSliderControl option datelimit is not two integers`;
        if (! Number.isInteger(this.options.datelimit[1])) throw `TimeSliderControl option datelimit is not two integers`;
        if (this.options.datelimit[0] >= this.options.datelimit[1]) throw `TimeSliderControl option datelimit max year must be greater than min year`;
        if (this.options.range[0] >= this.options.range[1]) throw `TimeSliderControl option range max year must be greater than min year`;
    }

    onAdd (map) {
        // keep a reference to our map, and create our basic control DIV
        this._map = map;
        this._container = document.createElement("DIV");
        this._container.className = "mapboxgl-ctrl mbgl-control-timeslider";

        // set up the UI buttons as raw HTML, then fetch references to them via querySelector()
        const stylesheetloader = this.options.loadIconStyleSheet ? `<link rel="stylesheet" href="${this.options.loadIconStyleSheet}" />` : '';

        this._container.innerHTML = `
        ${stylesheetloader}
        <div class="mbgl-control-timeslider-section-lhs">
            <br/>
            <input type="number" step="1" min="" max="" class="mbgl-control-timeslider-dateinput mbgl-control-timeslider-dateinput-min" />
        </div>
        <div class="mbgl-control-timeslider-section-cnt">
            <i class="mbgl-control-timeslider-button mbgl-control-timeslider-backbutton ${this.options.iconClassBack}"></i>
            <input type="number" step="1" min="" max="" class="mbgl-control-timeslider-dateinput mbgl-control-timeslider-dateinput-current" />
            <i class="mbgl-control-timeslider-button mbgl-control-timeslider-forwardbutton ${this.options.iconClassForward}"></i>
            <br/>
            <input type="range" min="" max="" value="" step="1" class="mbgl-control-timeslider-sliderbar" />
        </div>
        <div class="mbgl-control-timeslider-section-rhs">
            <br/>
            <input type="number" step="1" min="" max="" class="mbgl-control-timeslider-dateinput mbgl-control-timeslider-dateinput-max" />
        </div>
        `;

        this._forwardbutton = this._container.querySelector('i.mbgl-control-timeslider-forwardbutton');
        this._backbutton    = this._container.querySelector('i.mbgl-control-timeslider-backbutton');
        this._mindateinput  = this._container.querySelector('input.mbgl-control-timeslider-dateinput-min');
        this._maxdateinput  = this._container.querySelector('input.mbgl-control-timeslider-dateinput-max');
        this._datereadout   = this._container.querySelector('input.mbgl-control-timeslider-dateinput-current');
        this._sliderbar     = this._container.querySelector('input.mbgl-control-timeslider-sliderbar');

        // add titles
        // could do this in HTML above, but kind of nice to have all the text in one area
        this._forwardbutton.title   = `Shift time forward by one year`;
        this._backbutton.title      = `Shift time backward by one year`;
        this._mindateinput.title    = `Set the range and resolution of the slider, as far back as ${this.options.datelimit[0]}`;
        this._maxdateinput.title    = `Set the range and resolution of the slider, as far forward as ${this.options.datelimit[1]}`;
        this._datereadout.title     = `Manually enter a year to set the date filtering`;
        this._sliderbar.title       = `Adjust the slider to set the date filtering`;

        // add event handlers: + - buttons, text inputs, ...
        this._forwardbutton.addEventListener('click', (event) => {
            event.stopPropagation();
            event.preventDefault();
            this.yearForward();
        });
        this._backbutton.addEventListener('click', (event) => {
            event.stopPropagation();
            event.preventDefault();
            this.yearBack();
        });
        this._sliderbar.addEventListener('input', () => {
            this.setDate(this._sliderbar.value);
        });
        this._datereadout.addEventListener('input', () => {
            this.setDate(this._datereadout.value);
        });
        this._mindateinput.addEventListener('change', () => {
            this.setRangeLower(this._mindateinput.value);
        });
        this._maxdateinput.addEventListener('change', () => {
            this.setRangeUpper(this._maxdateinput.value);
        });

        // get started!
        // apply our settings to the date boxes, filling them in
        // do this internally so we don't have to work around undefined conditons during startup
        // then call our API methods once we're ready, to do UI updates and apply filtering
        this._range_limit = this.options.datelimit;
        this._current_year = this.options.date;
        this._current_range = this.options.range;

        this._sliderbar.min = this._range_limit[0];
        this._sliderbar.max = this._range_limit[1];
        this._sliderbar.value = this._current_year;

        this._mindateinput.min = this._range_limit[0];
        this._maxdateinput.min = this._range_limit[0];
        this._mindateinput.max = this._range_limit[1];
        this._maxdateinput.max = this._range_limit[1];

        setTimeout(() => {
            this._setupDateFiltersForLayers();
            this.setDate(this.options.date);
            this.setRange(this.options.range);
            this.options.onReady.call(this);
        }, 0.25 * 1000);

        // done; hand back our UI element as expected by the framework
        return this._container;
    }

    onRemove () {
        // reset layers we control, to whatever flters they previously had
        this._removeDateFiltersForLayers();

        // remove our UI from the map
        this._container.parentNode.removeChild(this._container);
        this._map = undefined;
    }

    getDefaultPosition () {
        return 'top-right';
    }

    getDate () {
        return this._current_date;
    }

    getRange () {
        return this._current_range;
    }

    getLimit () {
        return this._range_limit;
    }

    yearForward (years=1) {
        const newyear = this._current_date + years;

        if (! this.isDateWithinLimit(newyear)) {
            console.debug(`TimeSliderControl yearForward() new date ${newyear} outside datelimit, ignoring`);
            return this;
        }

        if (! this.options.autoExpandRange && ! this.isDateWithinRange(newyear)) {
            console.debug(`TimeSliderControl yearForward() new date ${newyear} outside range and autoExpandRange is false, ignoring`);
            return this;
        }

        this.setDate(newyear);
    }

    yearBack (years=1) {
        const newyear = this._current_date - years;

        if (! this.isDateWithinLimit(newyear)) {
            console.debug(`TimeSliderControl yearBack() new date ${newyear} outside datelimit, ignoring`);
            return this;
        }

        if (! this.options.autoExpandRange && ! this.isDateWithinRange(newyear)) {
            console.debug(`TimeSliderControl yearBack() new date ${newyear} outside range and autoExpandRange is false, ignoring`);
            return this;
        }

        this.setDate(newyear);
    }

    setDate (year) {
        // coerce strings, e.g. from input fields or whatever
        year = parseInt(year);

        // if the date is out of limit, do nothing; return ourself for method chaining
        if (year < this._range_limit[0] || year > this._range_limit[1]) return this;

        // if our new date is out of range, extend our range... or else force the date to be within range
        if (this.options.autoExpandRange) {
            if      (year > this._current_range[1]) this.setRangeUpper(year);
            else if (year < this._current_range[0]) this.setRangeLower(year);
        }
        else if (! this.isDateWithinRange(year)) {
            if      (year > this._current_range[1]) year = this._current_range[1];
            else if (year < this._current_range[0]) year = this._current_range[0];
        }

        // go ahead
        // set the newly-selected date and our readout
        this._current_date = year;
        this._datereadout.value = year;

        // adjust the slider to show the new date
        this._sliderbar.value = this._current_date;

        // oh yeah, we should filter the MBGL features
        this._applyDateFilterToLayers();

        // call the onDateSelect callback
        this.options.onDateSelect.call(this, this.getDate());

        // done, return ourself for method chaining
        return this;
    }

    setRange (newrange) {
        // coerce strings, e.g. from input fields or whatever
        newrange[0] = parseInt(newrange[0]);
        newrange[1] = parseInt(newrange[1]);

        // clip the range to fit the range limit, if necessary
        if (newrange[0] < this._range_limit[0]) {
            newrange[0] = this._range_limit[0];
            console.debug(`TimeSliderControl setRange() range exceeds datelimit setting, adjusting min date`);
        }
        if (newrange[1] > this._range_limit[1]) {
            newrange[1] = this._range_limit[1];
            console.debug(`TimeSliderControl setRange() range exceeds datelimit setting, adjusting max date`);
        }

        // sanity: min must <= max, or else ignore it
        if (newrange[1] <= newrange[0]) {
            console.debug(`TimeSliderControl setRange() max date must be greater than min date`);
        }

        // if the range would no longer include our currently-selected date, extend their range for them so the current date is still valid, before we apply it
        if (this._current_date < newrange[0]) {
            newrange[0] = this._current_date;
            console.debug(`TimeSliderControl setRange() extending range to include current date ${this._current_date}`);
        }
        else if (this._current_date > newrange[1]) {
            newrange[1] = this._current_date;
            console.debug(`TimeSliderControl setRange() extending range to include current date ${this._current_date}`);
        }

        // set the internal range, and the visible values in the box
        // if we disallow auto-expanding of the range, then also set these min/max in some input widgets
        this._current_range = newrange;

        this._mindateinput.value = this._current_range[0];
        this._maxdateinput.value = this._current_range[1];

        if (! this.options.autoExpandRange) {
            this._datereadout.min = this._current_range[0];
            this._datereadout.max = this._current_range[1];
        }

        // adjust the slider to show the new range
        this._sliderbar.min = this._current_range[0];
        this._sliderbar.max = this._current_range[1];

        // call the onRangeChange callback
        this.options.onRangeChange.call(this, this.getRange());

        // done, return ourself for method chaining
        return this;
    }

    setRangeUpper (newyear) {
        this.setRange([ this._current_range[0], newyear ]);

        // done, return ourself for method chaining
        return this;
    }

    setRangeLower (newyear) {
        this.setRange([ newyear, this._current_range[1] ]);

        // done, return ourself for method chaining
        return this;
    }

    isDateWithinRange (year) {
        return year >= this._current_range[0] && year <= this._current_range[1];
    }

    isDateWithinLimit (year) {
        return year >= this._range_limit[0] && year <= this._range_limit[1];
    }

    _getFilteredMapLayers () {
        const mapstyle = this._map.getStyle();
        if (! mapstyle.sources[this.options.sourcename]) {
            console.debug(`TimeSliderControl map has no source named ${this.options.sourcename}`);
            return;
        }

        const filterlayers = mapstyle.layers.filter((layer) => layer.source == this.options.sourcename);
        return filterlayers;
    }

    _setupDateFiltersForLayers () {
        // filtering by date has two parts:
        // OHM features which lack a OSM ID are "eternal" such as coastlines and mountain ranges; they will lack dates but should always match all date filters
        // OHM features which have a OSM ID, should be on the list of OSM IDs which _applyDateFilterToLayers() will figure out when the time comes
        //
        // strategy here:
        // we inject the osmfilteringclause, ensuring it falls into sequence as filters[1]
        // this osmfilteringclause will be rewritten by _applyDateFilterToLayers() to accmmodate both date-filtered features and eternal features
        //
        // warning: we are mutating someone else's map style in-place, and they may not be expecting that
        // if they go and apply their own filters later, it could get weird

        const layers = this._getFilteredMapLayers();

        layers.forEach((layer) => {
            // the OSM ID filter which we will prepend to the layer's own filters
            // the filter here is that OSM ID is missing, indicating features lacking a OSM ID, meaning "eternal" features such as coastline
            const osmfilteringclause = [ 'any', ['!has', 'osm_id'] ];

            const oldfilters = this._map.getFilter(layer.id);
            layers.oldfiltersbackup = oldfilters;  // keep a backup of the original filters for _removeDateFiltersForLayers()

            let newfilters;
            if (oldfilters === undefined) {  // no filter at all, so create one
                newfilters = [
                    "all",
                    osmfilteringclause,
                ];
                // console.debug([ `TimeSliderControl _setupDateFiltersForLayers() NoFilter ${layer.id}`, oldfilters, newfilters ]);
            }
            else if (oldfilters[0] === 'all') {  // all clause; we can just insert our clause into position as filters[1]
                newfilters = oldfilters.slice();
                newfilters.splice(1, 0, osmfilteringclause);
                // console.debug([ `TimeSliderControl _setupDateFiltersForLayers() AllFilter ${layer.id}`, oldfilters, newfilters ]);
            }
            else if (oldfilters[0] === 'any') {  // any clause; wrap theirs into a giant clause, prepend ours with an all
                newfilters = [
                    "all",
                    osmfilteringclause,
                    [ oldfilters ],
                ];
                // console.debug([ `TimeSliderControl _setupDateFiltersForLayers() AnyFilter ${layer.id}`, oldfilters, newfilters ]);
            }
            else if (Array.isArray(oldfilters)) {  // an array forming a single, simple-style filtering clause; rewrap as an "all"
                newfilters = [
                    "all",
                    osmfilteringclause,
                    oldfilters
                ];
                // console.debug([ `TimeSliderControl _setupDateFiltersForLayers() ArrayFilter ${layer.id}`, oldfilters, newfilters ]);
            }
            else {
                // some other condition I had not expected and need to figure out
                console.error(oldfilters);
                throw `TimeSliderControl _setupDateFiltersForLayers() got unexpected filtering condition on layer ${layerid} for the developer to figure out`;
            }

            // apply the new filter, with the placeholder "eternal features" filter now prepended
            this._map.setFilter(layer.id, newfilters);
        });
    }

    _removeDateFiltersForLayers () {
        // in _setupDateFiltersForLayers() we rewrote the layers' filters to support date filtering, but we also kept a backup
        // restore that backup now, so the layers are back where they started
        // use case is onRemove() when the timeslider is being removed from the map
        const layers = this._getFilteredMapLayers();

        layers.forEach((layer) => {
            this._map.setFilter(layer.id, layers.oldfiltersbackup);
        });
    }

    _applyDateFilterToLayers () {
        // back in _setupDateFiltersForLayers() we prepended a filtering clause as filters[1] which filters for "eternal" features lacking a OSM ID
        // here in _applyDateFilterToLayers() we add a second part to that, for features with a start_date and end_date fitting our date

        const layers = this._getFilteredMapLayers();

        const theyear = this._current_date.toString().padStart(4, '0');
        const mindate = parseFloat(`${theyear}.000001`);
        const maxdate = parseFloat(`${theyear}.999999`);
        // console.debug([ `TimeSliderControl _applyDateFilterToLayers date range is: ${mindate} - ${maxdate}`]);

        const datesubfilter = [
            'all',
            // has OSM ID, and also a start and end date defined (even if blank)
            ['has', 'osm_id'],
            ['has', 'start_date'],
            ['has', 'end_date'],
            // numerical start/end date either absent (beginning/end of time) or else within range
            [ 'any', ['!has', 'start_decdate'], ['<=', 'start_decdate', maxdate] ],
            [ 'any', ['!has', 'end_decdate'], ['>=', 'end_decdate', mindate] ],
        ];

        layers.forEach((layer) => {
            const newfilters = this._map.getFilter(layer.id).slice();
            newfilters[1][2] = datesubfilter.slice();
            this._map.setFilter(layer.id, newfilters);
            // console.debug([ `TimeSliderControl _applyDateFilterToLayers() ${layer.id} filters is now:`, newfilters ]);
        });
    }
}


export class UrlHashReader {
    constructor (options={}) {
        // only one option: the TimeSlider.TimeSliderControl() instance we should set and/or watch
        this.options = Object.assign({
            timeslidercontrol: undefined,
            leafletZoomLevelHack: false,  // Leaflet numbers zoom levels differently, always 1 less than MBGL does (L 15.6 = MB 16.6)
            watchHashChange: true,  // add event listener to watch for hashchange events?
        }, options);

        if (this.options.timeslidercontrol.constructor.name != 'TimeSliderControl') throw `UrlHashReader required timeslidercontrol option must point to a TimeSliderControl instance`;
    }

    onAdd (map) {
        // keep a reference to our map, and create our basic control DIV
        // we have no visible UI (the DIV has a display:none style) but are required to supply a DIV
        this._map = map;
        this._container = document.createElement("DIV");
        this._container.className = "mapboxgl-ctrl mbgl-control-timeslider-urlhashreader";

        // do our one job, but do it in a new context so the caller doesn't block
        setTimeout(() => {
            this._readAndApplyUrlHashParams();

            if (this.options.watchHashChange) {
                window.addEventListener('hashchange', () => { this.handleHashChange(); });
            }
        }, 1 * 1000);

        // done
        return this._container;
    }

    onRemove () {
        if (this.options.watchHashChange) {
            window.removeEventListener('hashchange', () => { this.handleHashChange(); });
        }

        this._map = null;
    }

    _readAndApplyUrlHashParams () {
        // parse the URL hash
        // example: #18/40.8217108/-73.9119449/1980,1970-2000
        // zoom, lat, lng, date and range
        const theregex = /^#(\d+\.?\d+)\/(\-?\d+\.\d+)\/(\-?\d+\.\d+)\/(\-?\d+),(\-?\d+)\-(\-?\d+)/;
        const thematch = location.hash.match(theregex);
        if (! thematch) return console.debug(`UrlHashReader found no URL params to apply`);

        let zoom = parseFloat(thematch[1]);
        const lat = parseFloat(thematch[2]);
        const lng = parseFloat(thematch[3]);
        const dateval = parseInt(thematch[4]);  // these will need changing if dates ever become something other than an integer year
        const datemin = parseInt(thematch[5]);
        const datemax = parseInt(thematch[6]);
        console.debug(`UrlHashReader found URL params: Z=${zoom} LL=${lat},${lng} DRange=${datemin}-${datemax} DVal=${dateval}`);

        if (this.options.leafletZoomLevelHack) {
            zoom = zoom - 1;
        }

        // apply map zoom and center; note that MBGL uses [lng,lat] while Leaflet uses [lat,lng]
        // then apply date to the control
        this._map.setCenter([lng, lat]).setZoom(zoom);
        this.options.timeslidercontrol.setDate(dateval).setRange([datemin, datemax]);
    }

    // we have no visible UI, but are required to implement this method
    getDefaultPosition () {
        return 'top-right';
    }

    handleHashChange () {
        const hash = window.location.hash;
        console.debug(['UrlHashReader handleHashChange()', hash, this]);
        this._readAndApplyUrlHashParams();
    }
}


export class UrlHashWriter {
    constructor (options={}) {
        // only one option: the TimeSlider.TimeSliderControl() instance we should set and/or watch
        this.options = Object.assign({
            timeslidercontrol: undefined,
            secondsBetweenUpdates: 1,  // undocumented, update URL every X seconds
            leafletZoomLevelHack: false,  // Leaflet numbers zoom levels differently, always 1 less than MBGL does (L 15.6 = MB 16.6)
        }, options);

        if (this.options.timeslidercontrol.constructor.name != 'TimeSliderControl') throw `UrlHashReader required timeslidercontrol option must point to a TimeSliderControl instance`;
    }

    onAdd (map) {
        // keep a reference to our map, and create our basic control DIV
        // we have no visible UI (the DIV has a display:none style) but are required to supply a DIV
        this._map = map;
        this._container = document.createElement("DIV");
        this._container.className = "mapboxgl-ctrl mbgl-control-timeslider-urlhashwriter";

        // do our one job, but do it in a new context so the caller doesn't block
        setTimeout(() => {
            this._startTrackingHashParams();
        }, 2 * 1000);

        // done
        return this._container;
    }

    onRemove () {
        this._stopTrackingHashParams();
        this._map = null;
    }

    _startTrackingHashParams () {
        if (this._timer) return;  // we are already tracking; done

        this._timer = setInterval(() => {
            this._updateHashParams();
        }, this.options.secondsBetweenUpdates * 1000);
    }

    _stopTrackingHashParams () {
        if (! this._timer) return;  // we are not tracking; done

        clearInterval(this._timer);
        this._timer = null;
    }

    _updateHashParams () {
        const cc = this._map.getCenter();
        const z = this._map.getZoom();
        const dr = this.options.timeslidercontrol.getRange();
        const dv = this.options.timeslidercontrol.getDate();

        // massage into our target values, e.g. rounding decimals and swapping sequences
        let zoom = z;
        const lat = cc.lat;
        const lng = cc.lng;
        const dateval = dv;
        const datemin = dr[0];
        const datemax = dr[1];

        if (this.options.leafletZoomLevelHack) {
            zoom = zoom + 1;
        }

        const urlhash = `#${zoom.toFixed(3)}/${lat.toFixed(5)}/${lng.toFixed(5)}/${dateval},${datemin}-${datemax}`;
        location.hash = urlhash;
    }

    // we have no visible UI, but are required to implement this method
    getDefaultPosition () {
        return 'top-right';
    }
}
