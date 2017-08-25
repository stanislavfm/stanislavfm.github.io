/**
 * Main controller, entrypoint
 */
var ClockManager = {

    clocks: [],

    isClockStarted: false,

    clockInterval: 0,
    resizeTimeout: 0,

    initialize: function () {

        ClockManager.initializeCanvas();

        ClockManager.renderClocks();

        ClockManager.addResizeHandler();

        ClockManager.runClocks();
    },

    initializeCanvas: function () {

        var newYorkClock = new Clock({
            canvasSelector: '#clock_new_york canvas',
            timezone: 'America/New_York'
        });

        var kyivClock = new Clock({
            canvasSelector: '#clock_kyiv canvas',
            timezone: 'Europe/Kiev'
        });

        var moscowClock = new Clock({
            canvasSelector: '#clock_moscow canvas',
            timezone: 'Europe/Moscow'
        });

        ClockManager.clocks = [
            newYorkClock,
            kyivClock,
            moscowClock
        ];

        _.each(ClockManager.clocks, function (clock) {

            var canvas = $(clock.getCanvasSelector());

            var size = $('.clock').width();

            canvas.width(size);
            canvas.height(size);

            clock.setCanvas(
                new paper.Project(canvas[0])
            );
        });
    },

    renderClocks: function () {

        _.each(ClockManager.clocks, function (clock) {

            clock.getCanvas().activate();

            var hourHand = new paper.Path({
                segments: [
                    [paper.view.center.x, paper.view.center.y + 10],
                    [paper.view.center.x, paper.view.center.y - 20]
                ],
                strokeColor: '#f0f0f0',
                strokeWidth: 3
            });

            var minuteHand = new paper.Path({
                segments: [
                    [paper.view.center.x, paper.view.center.y + 10],
                    [paper.view.center.x, paper.view.center.y - 35]
                ],
                strokeColor: '#f0f0f0',
                strokeWidth: 3
            });

            var secondHand = new paper.Path({
                segments: [
                    [paper.view.center.x, paper.view.center.y + 10],
                    [paper.view.center.x, paper.view.center.y - 40]
                ],
                strokeColor: '#f21416',
                strokeWidth: 1
            });

            var clockCenter = new paper.Shape.Circle({
                center: paper.view.center,
                fillColor: '#000000',
                radius: 1
            });

            var hands = new paper.Group({
                children: [hourHand, minuteHand, secondHand, clockCenter],
                opacity: 0
            });

            clock.setHands(hands);

            /**
             * Screen size workaround
             */

            if (window.innerWidth > 1500) {
                clock.getCanvas().view.scale(1.4);
            }
        });
    },

    addResizeHandler: function () {

        $(window).resize(function () {

            if (!ClockManager.isClockStarted) {
                return;
            }

            clearInterval(ClockManager.clockInterval);
            clearTimeout(ClockManager.resizeTimeout);

            _.each(ClockManager.clocks, function (clock) {
                clock.getCanvas().clear();
                clock.getCanvas().remove();
            });

            ClockManager.initializeCanvas();

            ClockManager.renderClocks();

            ClockManager.setCurrentTime(true);

            _.each(ClockManager.clocks, function (clock) {
                clock.getHands().opacity = 1;
            });

            var milliseconds = moment().millisecond();

            ClockManager.resizeTimeout = setTimeout(function () {
                ClockManager.runClocksInterval();
            }, 1000 - milliseconds);
        });
    },

    runClocks: function () {

        var milliseconds = moment().millisecond();

        setTimeout(function () {

            ClockManager.setCurrentTime();

            ClockManager.runIntroducing();

            ClockManager.runClocksInterval();

            ClockManager.isClockStarted = true;

        }, 2000 - milliseconds);
    },

    setCurrentTime: function (isResize) {

        isResize = isResize || false;

        _.each(ClockManager.clocks, function (clock) {

            var moment = ClockManager.getMoment(clock.getTimezone());

            var seconds = moment.seconds() + isResize;
            var secondHand = clock.getSecondHand();
            ClockManager.rotateHand(secondHand, seconds * 6);

            var minutes = moment.minutes();
            var minuteHand = clock.getMinuteHand();
            minuteHand.data.now = minutes;
            ClockManager.rotateHand(minuteHand, minutes * 6);

            var hours = parseInt(moment.format('h'));
            var hourHand = clock.getHourHand();
            ClockManager.rotateHand(hourHand, hours * 30 + Math.floor(minutes / 2));
        });
    },


    runClocksInterval: function () {

        ClockManager.clockInterval = setInterval(function () {

            _.each(ClockManager.clocks, function (clock) {

                var secondHand = clock.getSecondHand();
                var minuteHand = clock.getMinuteHand();
                var hourHand = clock.getHourHand();

                ClockHandAnimationManager.add(secondHand);

                var minutes = ClockManager.getMoment(clock.getTimezone()).minutes();
                if (minutes !== minuteHand.data.now) {
                    ClockHandAnimationManager.add(minuteHand);

                    if (minutes % 2 === 0) {
                        ClockManager.rotateHand(hourHand, 1);
                    }

                    minuteHand.data.now = minutes;
                }
            });

            ClockHandAnimationManager.run(6);

        }, 1000);
    },

    runIntroducing: function () {

        $('#clock-logo').fadeIn(200, function () {

            $('.clock-background').animate({
                opacity: 1
            }, 400, function () {

                setTimeout(function () {
                    paper.view.on('frame', ClockManager.introduceFrameHandler);
                }, 200);

                setTimeout(function () {
                    $('.clock-label').animate({
                        opacity: 1
                    }, 200, ClockManager.introduceLogo);
                }, 500);
            });
        });
    },

    introduceLogo: function () {

        var s = 0;
        for (var t = 1; t < 10; ++t) {
            s += 1000 / t;
            setTimeout(function () {
                $('#clock-logo img').toggle();
            }, s)
        }
    },

    introduceFrameHandler: function () {

        _.each(ClockManager.clocks, function (clock) {

            if (clock.getHands().opacity >= 1) {
                paper.view.off('frame', ClockManager.introduceFrameHandler);
                return;
            }

            clock.getHands().opacity += 0.05;
        });
    },

    rotateHand: function (hand, degree) {
        hand.rotate(degree, paper.view.center);
    },

    getMoment: function (timezone) {
        return moment().tz(timezone);
    }
};

/**
 * Manager of the clock hand animation
 */
var ClockHandAnimationManager = {

    hands: [],
    degree: 0,
    degreeRotated: 0,

    add: function (hand) {
        ClockHandAnimationManager.hands.push(hand);
    },

    run: function (degree) {

        ClockHandAnimationManager.degree = degree;
        ClockHandAnimationManager.degreeRotated = 0;

        paper.view.on('frame', ClockHandAnimationManager._frameHandler);
    },

    _stop: function () {
        ClockHandAnimationManager.hands = [];
        paper.view.off('frame', ClockHandAnimationManager._frameHandler);
    },

    _frameHandler: function () {

        if (ClockHandAnimationManager.degreeRotated === ClockHandAnimationManager.degree) {
            ClockHandAnimationManager._stop();
            return;
        }

        _.each(ClockHandAnimationManager.hands, function (hand) {
            hand.rotate(1, paper.view.center);
        });
        ClockHandAnimationManager.degreeRotated += 1;
    }
};


/**
 * Clock class
 */
function Clock (params) {

    this._name = params.name;
    this._canvasSelector = params.canvasSelector;
    this._timezone = params.timezone;

    this._canvas = {};
    this._hands = {};
}

Clock.prototype = {
    constructor: Clock,

    getName: function () {
        return this._name;
    },

    getCanvasSelector: function () {
        return this._canvasSelector;
    },

    getCanvas: function () {
        return this._canvas;
    },

    getHands: function () {
        return this._hands;
    },

    getTimezone: function () {
        return this._timezone;
    },

    getHourHand: function () {
        return this._hands.getItems()[0];
    },

    getMinuteHand: function () {
        return this._hands.getItems()[1];
    },

    getSecondHand: function () {
        return this._hands.getItems()[2];
    },

    setCanvas: function (canvas) {
        this._canvas = canvas;
    },

    setHands: function (hands) {
        this._hands = hands;
    }
};

/**
 * Entrypoint
 */
$(ClockManager.initialize);