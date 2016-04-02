/**
 * Created by eliotjohnson on 3/30/16.
 */

module.exports = function(app, rest, hubs, hubPaths) {

    /**
     * GET /api/hubs
     * Return all locker hubs
     */
    app.get('/api/hubs', function (req, res, next) {

        var response = [];

        for (var h in hubs) {
            var hub = hubs[h];

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

                    var coordinateString = data.coordinates;
                    hub.lat = 2;
                    hub.long = 2;

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
        }

        var baseUrl = urlForHub(hub);
        var url = baseUrl + hubPaths.getNumOpenLockers;

        var response = {};

        console.log('Requesting: '+url);

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
                    console.log(result.statusCode);
                    if (isError(result)) {
                        console.log('Error:', result.message);
                        res.status(500).send('An error occurred: '+result.message);
                    } else {
                        response.totalUnits = parseInt(data);
                        res.send(response);
                    }
                });
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