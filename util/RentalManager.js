/**
 * Created by eliotjohnson on 3/30/16.
 */

var Rental = require('../models/rental');

module.exports = function(app, rest, hubs, hubPaths, User) {

    /**
     * GET /api/hubs
     * Return all locker hubs
     */
    app.get('/api/hubs', function (req, res, next) {

        // for debug

        //var hubs = [{
        //    openUnits: 2,
        //    totalUnits: 3,
        //    lat: 42,
        //    long: -74,
        //    name: "NEU Hub",
        //    _id: 0,
        //    baseRate: 2,
        //    hourlyRate: 1.2
        //}];
        //
        //res.send(hubs);

        var response = [];

        console.log('iterating over hubs: '+hubs);

        for (var h in hubs) {
            var hub = hubs[h];

            console.log('hubs['+h+'] = '+hub);

            var baseUrl = urlForHub(hub);
            var url = baseUrl + hubPaths.getHubInfo;

            console.log('Requesting: '+url);

            rest.get(url).on('complete', function (data, result) {
                if (isError(result)) {
                    if(!result) {
                        res.status(500).send('Connection refused.');
                    }
                    else {
                        res.status(500).send('An error occurred: '+result.message);
                    }
                } else {

                    console.log(data);

                    hub.openUnits = parseInt(data.openUnits);
                    hub.totalUnits = parseInt(data.totalUnits);

                    hub.lat = parseFloat(data.lat);
                    hub.long = parseFloat(data.long);

                    response.push(hub);
                    if(response.length === hubs.length) {
                        res.send(response);
                    }
                }
            });
        }
    });

    /**
     * GET /api/hubs/:id
     * Return data for specified hub
     */
    app.get('/api/hubs/:id', function (req, res, next) {
        var hub = null;

        for(var h in hubs) {
            if(hubs[h]._id === parseInt(req.params.id)) {
                hub = hubs[h];
                break;
            }
        }

        if(!hub) {
            res.status(500).send('No hub exists for id='+req.params.id);
            return;
        }

        var baseUrl = urlForHub(hub);
        var url = baseUrl + hubPaths.getNumOpenLockers;

        var response = {};

        //console.log('Requesting: '+url);

        rest.get(url).on('complete', function(data, result) {
            if (isError(result)) {
                if(!result) {
                    res.status(500).send('Connection refused.');
                }
                else {
                    res.status(500).send('An error occurred: '+result.message);
                }
            } else {
                response.openUnits = parseInt(data);

                var baseUrl = urlForHub(hub);
                var url = baseUrl + hubPaths.getNumLockers;

                rest.get(url).on('complete', function(data, result) {
                    if (isError(result)) {
                        if(!result) {
                            res.status(500).send('Connection refused.');
                        }
                        else {
                            res.status(500).send('An error occurred: '+result.message);
                        }
                    } else {
                        response.totalUnits = parseInt(data);
                        res.send(response);
                    }
                });
            }
        });
    });

    app.get('/api/rentals/:active/:userId', function (req, res, next) {

        var active = req.params.active;

        var query = active == true ? {
            $or: [
                {
                    status: "RESERVED"
                }, {
                    status: "ACTIVE"
                }
            ]
        } : {
            $or: [
                {
                    status: "EXPIRED"
                }, {
                    status: "CANCELLED"
                }, {
                    status: "PAST"
                }
            ]
        };

        Rental.find(query, function(err, docs) {
            if(err) {
                res.status(500).send('Error retrieving rentals.')
            } else {
                console.log('found '+docs.length+' docs: '+JSON.stringify(docs));
                res.send(docs);
            }
        });

    });

    app.post('/api/reserve', function (req, res, next) {
        var hub = null;

        for(var h in hubs) {
            if(hubs[h]._id == parseInt(req.body.hubId)) {
                hub = hubs[h];
                break;
            }
        }

        if(!hub) {
            res.status(500).send('No hub exists for id='+req.body.id);
            return;
        }

        var baseUrl = urlForHub(hub);
        var url = baseUrl + hubPaths.allocateLocker;

        User.findById(req.body.userId, function(err, user) {
           if(err) {
               res.status(500).send('User not found.');
           } else {

               var jsonData = {
                   customer_id: req.body.userId,
                   pin: user.pin
               };

               rest.postJson(url, jsonData).on('complete', function (reservationData, result) {
                   if (isError(result)) {
                       if(!result) {
                           res.status(500).send('Connection refused.');
                       }
                       else {
                           res.status(500).send('An error occurred: '+result.message);
                       }
                   } else {

                       url = baseUrl + hubPaths.getHubInfo;

                       console.log('Requesting: '+url);

                       rest.get(url).on('complete', function (hubData, result) {
                           if (isError(result)) {
                               if(!result) {
                                   res.status(500).send('Connection refused.');
                               }
                               else {
                                   res.status(500).send('An error occurred: '+result.message);
                               }
                           } else {

                               console.log('here');

                               var rental = {
                                   userId: req.body.userId,
                                   rentalId: reservationData.rentalId,
                                   hubId: parseInt(hub._id),
                                   hubName: hub.name,
                                   lockerId: parseInt(reservationData.locker_id),
                                   lat: parseFloat(hubData.lat),
                                   long: parseFloat(hubData.long),
                                   baseRate: hub.baseRate,
                                   hourlyRate: hub.hourlyRate,
                                   reservationTime: Math.floor(Date.now() / 1000) //parseInt(reservationData.date_allocated)
                               };

                               console.log(JSON.stringify(rental));

                               Rental.create(rental, function(err, rental) {
                                   if(err) {
                                       console.log(err.message);
                                       res.status(500).send('An error occurred.');
                                   } else {
                                       console.log('sending rental');
                                       res.send(rental);
                                   }
                               });
                           }
                       });
                   }
               });
           }
        });
    });

    app.post('/api/rent', function(req, res, next) {

        // look for pre-existing rental (evidence of reservation)
        Rental.findById(req.body.uid, function(err, doc) {
            if(err) {

                console.log('No rental exists, querying for user id='+req.body.userId);

                // no rental exists, create new one
                User.findById(req.body.userId, function(err, user) {
                    if(err) {
                        res.status(500).send('User not found.');
                    } else {

                        var hub = null;

                        for(var h in hubs) {
                            if(hubs[h]._id === parseInt(req.body.hubId)) {
                                hub = hubs[h];
                                break;
                            }
                        }

                        if(!hub) {
                            res.status(500).send('No hub exists for id='+req.body.id);
                            return;
                        }

                        var baseUrl = urlForHub(hub);
                        var url = baseUrl + hubPaths.allocateLocker;

                        var jsonData = {
                            customer_id: req.body.userId,
                            pin: user.pin,
                            start_rental: 1
                        };

                        console.log('calling '+url+' with data: '+JSON.stringify(jsonData));

                        // call allocate_locker with flag set to 1, so that it will also immediately start the rental
                        rest.postJson(url, jsonData).on('complete', function(reservationData, result) {
                            if (isError(result)) {
                                console.log('error');
                                if(!result) {
                                    res.status(500).send('Connection refused.');
                                }
                                else {
                                    res.status(500).send('An error occurred: '+result.message);
                                }
                            } else {

                                console.log('no error');

                                url = baseUrl + hubPaths.getHubInfo;

                                rest.get(url).on('complete', function (hubData, result) {
                                    if (isError(result)) {
                                        if(!result) {
                                            res.status(500).send('Connection refused.');
                                        }
                                        else {
                                            res.status(500).send('An error occurred: '+result.message);
                                        }
                                    } else {

                                        console.log('here');

                                        var rental = {
                                            userId: req.body.userId,
                                            rentalId: reservationData.rentalId,
                                            hubId: parseInt(hub._id),
                                            hubName: hub.name,
                                            lockerId: parseInt(reservationData.locker_id),
                                            lat: parseFloat(hubData.lat),
                                            long: parseFloat(hubData.long),
                                            checkInTime: Math.floor(Date.now() / 1000), // parseInt(reservationData.date_in),
                                            baseRate: hub.baseRate,
                                            hourlyRate: hub.hourlyRate
                                        };

                                        console.log(JSON.stringify(rental));

                                        Rental.create(rental, function(err, rental) {
                                            if(err) {
                                                console.log(err.message);
                                                res.status(500).send('An error occurred.');
                                            } else {
                                                rental.status = "ACTIVE";
                                                rental.save();

                                                res.send(rental);
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });

            } else {
                console.log('Rental found: '+JSON.stringify(doc));

                // rental exists - notify hub to start the rental

                var hub = null;

                for(var h in hubs) {
                    if(hubs[h]._id == parseInt(req.body.hubId)) {
                        hub = hubs[h];
                        break;
                    }
                }

                if(!hub) {
                    res.status(500).send('No hub exists for id='+req.body.id);
                    return;
                }

                var baseUrl = urlForHub(hub);
                var url = baseUrl + hubPaths.startRental;

                var jsonData = {
                    customer_id: req.body.userId
                };

                rest.postJson(url, jsonData).on('complete', function(data, result) {
                    if (isError(result)) {
                        if(!result) {
                            res.status(500).send('Connection refused.');
                        }
                        else {
                            res.status(500).send('An error occurred: '+result.message);
                        }
                    } else {
                        doc.checkInTime = Math.floor(Date.now() / 1000); //data.time_in;
                        doc.status = "ACTIVE";
                        doc.save();

                        res.send(doc);
                    }
                });
            }
        });
    });

    app.post('/api/checkOut', function (req, res, next) {

        console.log('checking out... finding rental id='+req.body.uid);

        Rental.findById(req.body.uid, function(err, doc) {
            if(err) {
                res.status(500).send('Error retrieving rental.');
            } else {

                if(!doc) {
                    res.status(500).send('Error retrieving rental.');
                    return;
                }

                console.log('checking out rental:'+doc);

                var hub = null;

                for(var h in hubs) {
                    if(hubs[h]._id == doc.hubId) {
                        hub = hubs[h];
                        break;
                    }
                }

                if(!hub) {
                    res.status(500).send('No hub exists for id='+doc.hubId);
                    return;
                }

                var baseUrl = urlForHub(hub);
                var url = baseUrl + hubPaths.deallocateLocker;

                var jsonData = {
                    customer_id: req.body.userId
                };

                rest.postJson(url, jsonData).on('complete', function(data, result) {
                    if (isError(result)) {
                        console.log('is error result');
                        if(!result) {
                            res.status(500).send('Connection refused.');
                        }
                        else {
                            res.status(500).send('An error occurred: '+result.message);
                        }
                    } else {

                        console.log('check out data: '+JSON.stringify(data));

                        if(data.err) {
                            res.status(500).send('No locker to deallocate.');
                            return;
                        }

                        console.log('check out data:'+JSON.stringify(data));

                        if(!data.date_out) {
                            res.status(500).send('No end time specified.');
                            return;
                        }

                        doc.checkOutTime = data.date_out;
                        doc.status = doc.status == "RESERVED" ? "CANCELLED" : "PAST";
                        doc.save();

                        res.send(doc);
                    }
                });
            }
        });
    });

    app.post('/api/pi/reservationExpired', function(req, res, next) {

        var hubId = parseInt(req.body.hubId);
        var lockerId = parseInt(req.body.lockerId);

        Rental.findOne({ hubId: hubId, lockerId: lockerId }, function(err, doc) {
            if(err) {
                res.status(500).send('Failure.');
            } else {
                doc.status = "EXPIRED";
                doc.save();

                res.send('Success.');
            }
        });

    });

    app.get('/api/getExpirationNotifs', function(req, res, next) {

        var userId = req.params.userId;

        Rental.find({ userId: userId, status: 'EXPIRED', firedExpirationNotif: false }, function(err, docs) {
            if(err) {
                res.status(500).send('Error fetching lockers.');
            } else {
                res.send(docs);
            }
        });


    });

    app.post('/api/firedNotif', function(req, res, next) {

        var uid = req.body.uid;
        var type = req.body.type;

        Rental.findById(uid, function(err, doc) {
           if(err) {
               res.status(500).send('Could not find locker.');
           } else {

               switch(type) {
                   case "EXPIRATION":
                       doc.firedExpirationNotif = true;
                       break;
                   case "PROXIMITY":
                       doc.firedProximityNotif = true;
                       console.log('setting proximity notif to true');
                       break;
                   case "DURATION":
                       doc.firedDurationNotif = true;
                       break;
                   default:
                       res.status(500).send('Failure');
                       return;
               }

               doc.save();

               res.send('Success.');
           }
        });

    });

    app.post('/api/unlock', function(req, res) {

        console.log('here 1');

        Rental.findById(req.body.uid, function(err, rental) {
            if(err) {
                res.status(500).send('Error.');
            } else {

                console.log('here 2');

                if(!rental) {
                    res.status(500).send('Error.');
                    return;
                }

                User.findById(rental.userId, function(err, user) {
                   if(err) {
                       res.status(500).send('Error.');
                   } else {

                       console.log('here 3');

                       if(!user) {
                           res.status(500).send('Error.');
                       }

                       var hub = null;

                       for(var h in hubs) {

                           console.log('loop id:'+hubs[h]._id+', hubId:'+rental.hubId);

                           if(hubs[h]._id === parseInt(rental.hubId)) {
                               hub = hubs[h];
                               break;
                           }
                       }

                       if(!hub) {
                           res.status(500).send('No hub exists for id='+rental.hubId);
                           return;
                       }

                       var baseUrl = urlForHub(hub);
                       var url = baseUrl + hubPaths.openLocker;

                       var jsonData = {
                           customer_id: rental.userId,
                           locker_id: rental.lockerId,
                           pin: user.pin
                       };

                       console.log(JSON.stringify(jsonData));

                       rest.postJson(url, jsonData).on('complete', function(data, result) {
                           if(isError(result)) {
                               res.status(500).send('Error.');
                           } else {
                               if(data.err) {
                                   res.status(500).send('Error.');
                                   return;
                               }

                               console.log('Unlock data: '+JSON.stringify(data));

                               var jsonResponse = {
                                   timestamp: data.TimeOpened
                               };

                               res.json(jsonResponse);
                           }
                       });
                   }
                });
            }
        });

    });

    app.get('/api/doorStatus', function(req, res) {

        var hubId = parseInt(req.query.hubId);
        var lockerId = parseInt(req.query.lockerId);

        var hub = null;

        console.log('hubId='+hubId);

        for(var h in hubs) {
            if(hubs[h]._id == hubId) {
                hub = hubs[h];
                break;
            }
        }

        if(!hub) {
            res.status(500).send('No hub exists for id='+req.body.id);
            console.log('uh oh');
            return;
        }

        var baseUrl = urlForHub(hub);
        var url = baseUrl + hubPaths.doorStatus;

        console.log('checkin the door yo: '+url);

        url += '?locker_id='+lockerId;

        rest.get(url).on('complete', function(data, result) {
            if(isError(result)) {
                res.status(500).send('Error.');
            } else {
                if(!data) { // door opened
                    res.send('OPEN');
                } else {
                    res.send('CLOSED');
                }
            }
        });
    });

    // helper methods

    function isError(result) {
        return !result || result.statusCode !== 200;
    }

    function urlForHub(hub) {
        return 'http://' + hub.host + ':' + hub.port;
    }

};