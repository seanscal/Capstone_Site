// Babel ES6/JSX Compiler
require('babel-core/register');

var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var compression = require('compression');
var favicon = require('serve-favicon');
var logger = require('morgan');
var async = require('async');
var colors = require('colors');
var mongoose = require('mongoose');
var request = require('request');
var React = require('react');
var ReactDOM = require('react-dom/server');
var Router = require('react-router');
var swig = require('swig');
var xml2js = require('xml2js');
var _ = require('underscore');
var querystring = require('querystring');
var http = require('http');
var fs = require('fs');
var rest = require('restler');
var config = require('./config');
var routes = require('./app/routes');
var User = require('./models/user');

var hubs = require('./util/hubs');
var hubFunctions = require('./util/hubFunctions');

var hubPaths = {
    getUid: hubFunctions[0].path,
    getCoordinates: hubFunctions[1].path,
    getNumLockers: hubFunctions[2].path,
    allocateLocker: hubFunctions[3].path,
    startRental: hubFunctions[4].path,
    deallocateLocker: hubFunctions[5].path,
    customerStatus: hubFunctions[6].path,
    openLocker: hubFunctions[7].path,
    getOpenLockers: hubFunctions[8].path,
    getNumOpenLockers: hubFunctions[9].path
};

var app = express();

var options = {
    server: {socketOptions: {keepAlive: 1, connectTimeoutMS: 30000}},
    replset: {socketOptions: {keepAlive: 1, connectTimeoutMS: 30000}}
};
mongoose.connect(config.database, options);
mongoose.connection.on('error', function () {
    console.info('Error: Could not connect to MongoDB. Did you forget to run `mongod`?'.red);
});


app.set('port', process.env.PORT || 3000);
app.use(compression());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(favicon(path.join(__dirname, 'public', 'favicon.png')));
app.use(express.static(path.join(__dirname, 'public')));

/**
 * POST /api/users
 * Adds new user to the database.
 */
app.post('/api/users', function (req, res, next) {
    var email = req.body.email;
    var name = req.body.name;
    var birthday = req.body.birthday;
    var gender = req.body.gender;
    var picture = req.body.picture;
    var userId = req.body.id;
    var pin = req.body.pin;


    User.findOne({email: email}, function (err, user) {
        if (err) return next(err);

        if (!user) {
            var user = new User({
                userId: userId,
                name: name,
                email: email,
                birthday: birthday,
                gender: gender,
                picture: picture,
                pin: pin,
                updateTimeStamp: updateTimeStamp
            });
            user.save(function (err) {
                if (err) return next(err);
            });
            res.send(user);
        }
        else {
            res.send(user);
        }
    });
});

/**
 * PUT /api/users
 * Updates user in the database.
 */
app.put('/api/users', function (req, res, next) {
    var email = req.body.email;
    var name = req.body.name;
    var birthday = req.body.birthday;
    var picture = req.body.picture;
    var userId = req.body.id;
    var pin = req.body.pin;
    var picture = req.body.picture;
    var updateTimeStamp = req.body.updateTimeStamp;


    User.findOne({email: email}, function (err, user) {
        if (err) return next(err);

        if (user) {
            user.userId = userId;
            user.name = name;
            user.email = email
            user.birthday = birthday;
            user.pin = pin;
            user.picture = picture;
            user.updateTimeStamp = updateTimeStamp;

            user.save(function (err) {
                if (err) return next(err);
            });
            console.log(user);
            res.send(user);
        }
        else {
            console.log("shit");
            res.send("NOT FOUND");
        }
    });
});

/**
 * GET /api/users
 * Return all users
 */
app.get('/api/users', function (req, res, next) {
    var params = req.query;
    var conditions = {};

    _.each(params, function (value, key) {
        conditions[key] = new RegExp('^' + value + '$', 'i');
    });

    User
        .find()
        .exec(function (err, users) {
            res.send(users);
        });
});

/**
 * GET /api/users/:id
 * Return user of id :id
 */
app.get('/api/users/:id', function (req, res, next) {
    var id = req.params.id;
    var email = req.params.email;

    User.findOne({email: email}, function (err, user) {
        if (err) return next(err);

        if (!user) {
            return res.status(404).send({message: 'User not found.'});
        }

        res.send(user);
    });
});

/**
 * GET /api/hubs
 * Return all locker hubs
 */
app.get('/api/hubs', function (req, res, next) {

    //var response = [];
    //
    //console.log('Entering loop');
    //
    //for (var h in hubs) {
    //    var hub = hubs[h];
    //
    //    var baseUrl = urlForHub(hub);
    //    var url = baseUrl + hubPaths.getNumOpenLockers;
    //
    //    console.log('requesting: ' + url);
    //
    //    rest.get(url).on('complete', function (result) {
    //        if (result instanceof Error) {
    //            console.log('Error:', result.message);
    //            this.retry(5000); // try again after 5 sec
    //        } else {
    //            console.log('got result');
    //            hub.openUnits = parseInt(result);
    //            response.push(hub);
    //        }
    //    });
    //
    //}
    //
    //while (response.length < hubs.length) {
    //    // wait for all requests
    //    console.log(response.length);
    //}
    //
    //res.send(response);

    res.send([{uid: 1, name: "NEU Hub", openUnits: 2, lat: 42.3399, long: -71.0892, hourlyRate: 5.25, baseRate: 2},
        {uid: 2, name: "NYC Hub", openUnits: 4, lat: 40.7127, long: -74.0059, hourlyRate: 1.25, baseRate: 2}]);
});

function urlForHub(hub) {
    return 'http://' + hub.host + ':' + hub.port;
}

/**
 * GET /api/hubs/:id
 * Return data for specified hub
 */
app.get('/api/hubs/:id', function (req, res, next) {
    // temporarily hardcoding a response

    var totalUnits = 6;
    var openUnits = Math.floor((Math.random() * totalUnits) + 1);
    res.send({totalUnits: totalUnits, openUnits: openUnits});

    /** TODO:
     * Ultimately this method will return metadata for the specified locker hub (human-readable location, total
     * # of units, # available units, and hourly rate.
     */
});

app.get('/api/rentals/:active/:userId', function (req, res, next) {
    var pastRentals = [{
        uid: 1,
        userId: 1,
        hubId: 1,
        hubName: "NEU Hub",
        lockerId: 3,
        lat: 42.3399,
        long: -71.0892,
        checkInTime: 1457592837,
        checkOutTime: 1457603829,
        isActive: false,
        baseRate: 2.00,
        hourlyRate: 1.25
    }, {
        uid: 2,
        userId: 1,
        hubId: 1,
        hubName: "NYC Hub",
        lockerId: 2,
        lat: 42.3399,
        long: -71.0892,
        checkInTime: 1457604893,
        checkOutTime: 1457609983,
        isActive: false,
        baseRate: 2.00,
        hourlyRate: 1.25
    }, {
        uid: 3,
        userId: 1,
        hubId: 1,
        hubName: "NEU Hub",
        lockerId: 5,
        lat: 42.3399,
        long: -71.0892,
        checkInTime: 1457611032,
        checkOutTime: 1457614325,
        isActive: false,
        baseRate: 2.00,
        hourlyRate: 1.25
    }];

    var activeRentals = [{
        uid: 4,
        userId: 1,
        hubId: 1,
        hubName: "Prudential Hub",
        lockerId: 1,
        lat: 42.3399,
        long: -71.0892,
        checkInTime: Math.trunc((((new Date()).getTime() / 1000) - 4215)),
        checkOutTime: null,
        isActive: true,
        baseRate: 2.00,
        hourlyRate: 5.25
    }];

    var active = req.params.active;
    console.log(active);
    res.send(active == true ? activeRentals : pastRentals);

});

app.get('/api/pi', function (req, res, next) {
    var options = {
        host: "71.234.41.9",
        port: 5000,
        path: '/test',
        method: 'GET'
    };

    http.request(options, function (res) {
        console.log('STATUS: ' + res.statusCode);
        console.log('HEADERS: ' + JSON.stringify(res.headers));
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log('BODY: ' + chunk);
        });
    }).end();
});

app.post('/api/allocate', function (req, res, next) {

    var baseurl = "http://71.234.41.9:5000/allocate_locker"
    var jsonData = {"locker_id": "5345", "customer_id": "5345"};

    rest.postJson(baseurl, jsonData).on('complete', function (data) {
        if (data.error) {
            sys.puts("Error: " + data.error_message);
        }
        console.log(data);
    });
});


app.post('/api/deallocate', function (req, res, next) {

    var baseurl = "http://71.234.41.9:5000/deallocate_locker"
    var jsonData = {"locker_id": "5345", "customer_id": "5345"};

    rest.postJson(baseurl, jsonData).on('complete', function (data) {
        if (data.error) {
            sys.puts("Error: " + data.error_message);
        }
        console.log(data);
    });
});


// This Might be useful
// /**
//  * GET /api/characters/search
//  * Looks up a character by name. (case-insensitive)
//  */
// app.get('/api/characters/search', function(req, res, next) {
//   var characterName = new RegExp(req.query.name, 'i');

//   Character.findOne({ name: characterName }, function(err, character) {
//     if (err) return next(err);

//     if (!character) {
//       return res.status(404).send({ message: 'Character not found.' });
//     }

//     res.send(character);
//   });
// });


app.use(function (req, res) {
    Router.match({routes: routes.default, location: req.url}, function (err, redirectLocation, renderProps) {
        if (err) {
            res.status(500).send(err.message)
        } else if (redirectLocation) {
            res.status(302).redirect(redirectLocation.pathname + redirectLocation.search)
        } else if (renderProps) {
            var html = ReactDOM.renderToString(React.createElement(Router.RoutingContext, renderProps));
            var page = swig.renderFile('views/index.html', {html: html});
            res.status(200).send(page);
        } else {
            res.status(404).send('Page Not Found')
        }
    });
});

app.use(function (err, req, res, next) {
    console.log(err.stack.red);
    res.status(err.status || 500);
    res.send({message: err.message});
});

/**
 * Socket.io stuff.
 */
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var onlineUsers = 0;

io.sockets.on('connection', function (socket) {
    onlineUsers++;

    io.sockets.emit('onlineUsers', {onlineUsers: onlineUsers});

    socket.on('disconnect', function () {
        onlineUsers--;
        io.sockets.emit('onlineUsers', {onlineUsers: onlineUsers});
    });
});

server.listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});