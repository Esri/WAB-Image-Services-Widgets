//////////////////////////////////////////////////////////////////////////////
// Copyright 2013 Esri
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//////////////////////////////////////////////////////////////////////////////

define([
        "dojo/_base/declare",
        "./../../BaseDiscoveryMixin",
        "esri/TimeExtent",
        "dojo/_base/array"
    ],
    function (declare, BaseDiscoveryMixin, TimeExtent, array) {
        return declare([BaseDiscoveryMixin], {
            useUTCDate: true,
            UNITS: {
                DAY: "DAY",
                MONTH: "MONTH",
                YEAR: "YEAR",
                UNKNOWN: "UNKNOWN"
            },
            MS_LOOKUP: {
                DAY: 86400000,
                MONTH: 2.63e+9,
                YEAR: 3.156e+10
            },
            constructor: function (results, useUTCDate) {
                this.useUTCDate = useUTCDate;
                this._processResults(results);
            },
            _processResults: function (results) {
                var currentTime, currentDate, currentStartOfDayTime, i;
                this.dateArray = [];
                for (i = 0; i < results.length; i++) {
                    currentTime = results[i][this.COMMON_FIELDS.DATE_FIELD];
                    if (currentTime || currentTime === 0) {
                        this.dateArray.push(currentTime);

                    }
                }
                this.dateArray.sort(function (a, b) {
                    return a - b;
                });
                var uniqueArray = [];
                for (i = 0; i < this.dateArray.length; i++) {
                    currentDate = this._getDate(this.dateArray[i]);
                    currentDate.setHours(0);
                    currentDate.setMinutes(0);
                    currentDate.setSeconds(0);
                    currentStartOfDayTime = currentDate.valueOf();
                    if (array.indexOf(uniqueArray, currentStartOfDayTime) < 0) {
                        uniqueArray.push(currentStartOfDayTime);
                    }
                }
                this.uniqueValueCount = uniqueArray.length;
            },
            getInterval: function () {
                var units = this.getUnits();
                if (units === this.UNITS.UNKNOWN) {
                    return null;
                }
                var delta = this.getMax() - this.getMin();
                if (units === this.UNITS.DAY) {
                    return {interval: Math.ceil(delta / this.MS_LOOKUP.DAY), units: this.UNITS.DAY};
                }
                if (units === this.UNITS.MONTH) {
                    return {interval: Math.ceil(delta / this.MS_LOOKUP.MONTH), units: this.UNITS.MONTH};
                }
                if (units === this.UNITS.YEAR) {
                    return {interval: Math.ceil(delta / this.MS_LOOKUP.YEAR), units: this.UNITS.YEAR};
                }
            },
            getUnits: function () {
                if (this.dateArray && this.dateArray.length > 1) {
                    var delta = this.getMax() - this.getMin();
                    if (delta < this.MS_LOOKUP.DAY) {
                        return this.UNITS.DAY;
                    }
                    if (delta < this.MS_LOOKUP.MONTH) {
                        return this.UNITS.MONTH;
                    }
                    return this.UNITS.YEAR;
                }
                else {
                    return this.UNITS.UNKNOWN;
                }
            },
            getUniqueCount: function () {
                return this.uniqueValueCount;
            },
            getMin: function () {
                if (this.dateArray && this.dateArray.length > 0) {
                    return this.dateArray[0];
                }
                return null;
            },
            getMax: function () {
                if (this.dateArray && this.dateArray.length > 0) {
                    return this.dateArray[this.dateArray.length - 1];

                }
                return null;
            },
            getSum: function () {
                return this._getSum(this.dateArray);
            },
            _getSum: function (arr) {
                if (!arr) {
                    return 0;
                }
                var value = 0, i;
                for (i = 0; i < arr.length; i++) {
                    value += arr[i];
                }
                return value;
            },
            getMean: function () {
                return this._getMean(this.dateArray);
            },
            _getMean: function (arr) {
                if (!arr) {
                    return null;
                }
                return this._getSum(arr) / arr.length;
            },
            getMedian: function () {
                if (!this.dateArray) {
                    return null;
                }
                // odd so get the value
                if (this.dateArray.length % 2 === 1) {
                    return this.dateArray[(this.dateArray.length - 1) / 2];
                }
                var a, b;
                // average of the two numbers  at the center of the list
                a = this.dateArray[(this.dateArray.length / 2) - 1];
                b = this.dateArray[(this.dateArray.length / 2)];
                return (a + b) / 2;

            },
            getMode: function () {
                if (!this.dateArray) {
                    return null;
                }
                if (this.dateArray.length === 1) {
                    return this.dateArray[0];
                }
                var i,
                    last = this.dateArray[0],
                    value,
                    max_seen = 0,
                    seen_this = 1;
                for (i = 1; i < this.dateArray.length + 1; i++) {
                    if (this.dateArray[i] !== last) {
                        if (seen_this > max_seen) {
                            max_seen = seen_this;
                            seen_this = 1;
                            value = last;
                        }
                        last = this.dateArray[i];
                    } else {
                        seen_this++;
                    }
                }
                return value;
            },
            getStops: function (stepCount) {
                if (!this.dateArray) {
                    return [];
                }
                if (this.dateArray.length < stepCount) {
                    return this.dateArray;
                }
                var startTime, endTime, startDate, endDate, offset, te, timeExtent;
                startTime = this.dateArray[0];
                endTime = this.dateArray[(this.dateArray.length - 1)];
                startDate = this._getDate(startTime);
                endDate = this._getDate(endTime);
                timeExtent = new TimeExtent(startDate, endDate);
                offset = Math.ceil((endTime - startTime) / stepCount - 1);
                var timeStops = [];
                te = startDate;
                while (te <= endTime) {
                    timeStops.push(te);
                    te = timeExtent._getOffsettedDate(te, offset, "esriTimeUnitsMilliseconds");
                }

                if (timeStops.length > 0 && timeStops[timeStops.length - 1] < endTime) {
                    timeStops.push(te);
                }
            },
            _getDate: function (value) {
                var date = new Date(value);
                if (this.useUTCDate) {
                    date = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
                }
                return date;
            },

            getStandardDeviation: function () {
                // The standard deviation of no numbers is null
                if (this.dateArray.length === 0) {
                    return null;
                }

                return Math.sqrt(this.getVariance());
            },
            getVariance: function () {
                // The variance of no numbers is null
                if (this.dateArray.length === 0) {
                    return null;
                }

                var i,
                    mean_value = this.getMean(),
                    deviations = [];

                // Make a list of squared deviations from the mean.
                for (i = 0; i < this.dateArray.length; i++) {
                    deviations.push(Math.pow(this.dateArray[i] - mean_value, 2));
                }

                // Find the mean value of that list
                return this._getMean(deviations);
            }
        });
    })
;