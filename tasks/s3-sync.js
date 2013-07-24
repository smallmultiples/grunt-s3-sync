/*
 * grunt-contrib-uglify
 * https://gruntjs.com/
 *
 * Copyright (c) 2013 Small Multiples
 * Licensed under the MIT license.
 */

'use strict';

// External libs.
var s3sync = require('./lib/s3-sync')
  , zlib = require('zlib')
  , fs = require('fs')


module.exports = function(grunt) {
  grunt.registerMultiTask('s3-sync', 'A streaming interface for uploading multiple files to S3.', function() {
    var options = this.options()
      , db
    if (options.db) {
      db = options.db
      delete options.db
    } else {
      db = options
      options = false
    }

    // Init the stream
    var stream = s3sync(db, options, grunt.log)

    this.files.forEach(function(file) {
      file.src.forEach(function(src) {
        // GZip the file
        if (file.gzip) {
          // @TODO check that it's a Buffer
          src = fs.createReadStream(src).pipe(zlib.createGzip())
        }

        console.log(src)

        stream.write({
            src: src
          , dest: file.dest
        })
      })
    })

    stream.end()
  })
}