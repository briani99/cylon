var express = require('express')
	util = require('util'),
	url = require('url'),
    twitter = require('twitter'),
	hdb = require('hdb')
	emojiStrip = require('emoji-strip');

var port = process.env.PORT || 3000;

var twitter = new twitter({
    consumer_key: 'dNazjSOPupJdT5C8kw2cBg2rd',
    consumer_secret: 'SLvFrdFnU9R6aCu3qrK3fJpl1dtr8BHxjd1pKeaOQHlKTenUmT',
    access_token_key: '2296390014-QkjCYO1eKzUC1eyVbWrcbhi26DWSWAmQ93jcgFR',
    access_token_secret: 'l0c8I8hvDn3dRVJjzsQVPob0Wd2s4AJAQGwM2PCcdniCg'
});

var hdb = hdb.createClient({
	host     : 'localhost',
	port     : 30015,
	user     : 'DEV_09JJ2B5LZBS84RR62NHJJB1QB',
	password : 'Yb1Mz3KYvSl6zRT'
});
var hdb_schema = "NEO_AOMKFZGDDYAF7FGDQ5KJ30OQL";

hdb.connect(function (err) {
	if (err) {
		return console.error('HDB connect error:', err);
	} 
});

var app = express();

app.all('*', function(req, res, next) {
	res.header("Content-Type", "text/plain");
	res.header("Access-Control-Allow-Origin", "*");
	next();
});

app.get('/startcylon', function(req, res, next){
	if (typeof twitter.currentTwitterStream !== 'undefined') {
		console.log('Stop');
		twitter.currentTwitterStream.destroy();
	}
	var track = req.param("track");
	if (track !== undefined) {
		console.log('Start tracking', track);
		res.send('Start');
		twitter.stream('user', {track: track}, function(stream) {
			stream.on('data', function(data) {
				if (typeof data.id_str !== 'undefined') {
					var myDate = new Date(Date.parse(data.created_at.replace(/( +)/, 'UTC$1')));
					var createdAt = myDate.getFullYear() + '-' + eval(myDate.getMonth()+1) + '-' + myDate.getDate() + ' ' + myDate.getHours() + ':' + myDate.getMinutes() + ':' + myDate.getSeconds();
					var replyUser = '';
					if (data.in_reply_to_screen_name !== null) {
						replyUser = data.in_reply_to_screen_name
					}
					var retweetedUser = '';
					if (typeof data.retweeted_status !== 'undefined') {
						retweetedUser = data.retweeted_status.user.screen_name;
					}
					var lat = null;
					var lon = null;
					if (data.geo !== null) {
						lat = data.geo.coordinates[0];
						lon = data.geo.coordinates[1];
					}
					console.log('Tweet:', data.id_str, data.lang, createdAt, data.user.screen_name, data.text, replyUser, retweetedUser, lat, lon);
					var sql = 'INSERT INTO "' + hdb_schema + '"."Tweets" ("id","created","text","lang","user","replyUser","retweetedUser"';
					if (data.geo !== null) {
						sql += ',"lat","lon"';
					}
					sql += ') VALUES(\'' + data.id_str + '\',\'' + createdAt + '\',\'' + emojiStrip(data.text.replace(/\'/g," ")) + '\',\'' + data.lang + '\',\'' + data.user.screen_name + '\',\'' + replyUser + '\',\'' + retweetedUser + '\'';
					if (data.geo !== null) {
						sql += ',' + lat + ',' + lon;
					}
					sql += ')';
					hdb.exec(sql, function(err, affectedRows){
						if (err) {
							console.log('Error:', err);  
							console.log('SQL:', sql);
							return console.error('Error:', err);
						}  
						console.log('Tweet inserted:', data.id_str, createdAt, affectedRows);  
					});
				}
			});
			twitter.currentTwitterStream = stream;
		});
	} else {
		res.send('Nothing to track');
	}
});

app.get('/stopcylon', function(req, res, next){
	if (typeof twitter.currentTwitterStream !== 'undefined') {
		console.log('Stop');
		res.send('Stop');
		twitter.currentTwitterStream.destroy();
	} else {
		console.log('Nothing to stop');
		res.send('Nothing to stop');
	}
});

var server = app.listen(port, function() {
	console.log('Listening on port %d', port);
});