'use strict';
require('dotenv').config();
var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var autoIncrement = require('mongoose-auto-increment');
var bodyParser = require('body-parser');
var url = require('url');
var dns = require('dns');

var cors = require('cors');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
var connection = mongoose.connect(process.env.MONGOLAB_URI, {
  user: process.env.DB_USER,
  pass: process.env.DB_PASSWORD,
  useNewUrlParser: true,
});

autoIncrement.initialize(connection);

var shortUrlSchema = new Schema({
  original_url: {
    type: String,
    required: true,
  },
  short_url: {
    type: Number,
    required: true,
  },  
});

shortUrlSchema.plugin(autoIncrement.plugin, { model: 'ShortUrl', field: 'short_url' });

var ShortUrl = connection.model('ShortUrl', shortUrlSchema);

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser.urlencoded({ extended: false }));


app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

  
// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});


app.get('/api/shorturl/:shorturl', function(req, res) {
  var shortUrl = req.params.shorturl;
  ShortUrl.findOne({ short_url: shortUrl }, function(err, data) {
    if (err) {
      return res.json({"error": "error querying the database."});
    }

    if (!data) {
      return res.json({"error": "there is no short URL '" + shortUrl + "' on record."});
    }

    res.redirect(data.original_url);
  });
});

app.post('/api/shorturl/new', function(req, res) {
  var originalUrl = req.body.url;
  var parsedUrl = url.parse(originalUrl);
  var host = parsedUrl.host;
  if (!host) {
    return res.json({"error": "invalid URL"});
  }

  dns.lookup(host, null, function(err, address, family) {
    if (err) {
      return res.json({"error": "invalid URL"});
    }
    
    ShortUrl.findOne({ original_url: originalUrl }, function(err, shortUrl) {
      if (err) {
        return res.json({"error": "error querying the database."});
      }

      if (shortUrl) {
        return res.json({"original_url": shortUrl.original_url, "short_url": shortUrl.short_url});
      }

      var newShortUrl = new ShortUrl({
        original_url: originalUrl,
      });

      newShortUrl.save(function(err, data) {
        if (err) {
          return res.json({"error": "error saving the URL to the database."});
        }

        res.json({"original_url": data.original_url, "short_url": data.short_url});
      });
    });
  });
});

app.listen(port, function () {
  console.log('Node.js listening ...');
});