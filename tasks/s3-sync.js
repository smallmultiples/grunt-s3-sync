/*
 * grunt-contrib-uglify
 * https://gruntjs.com/
 *
 * Copyright (c) 2013 Small Multiples
 * Licensed under the MIT license.
 */

'use strict';

// External libs.
var s3sync = require('s3-sync')
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

    // // Init the stream
    var stream = s3sync(db, options)

    // Log upload message
    stream.on('data', function(file) {
      grunt.log.ok(file.absolute, file.relative)
    })
    stream.on('fail', function(err) {
      grunt.log.error(err.toString())
    })

    // Get the actual number of files to upload
    var nbFiles = grunt.util._.chain(this.files)
    .pluck('src')
    .pluck('length')
    .reduce(function(a, b) {
        return a + b
    })
    .value()

    // Handle the upload for each files
    var uploadFile = function(src, dest) {
        stream.write({
            src: src
          , dest: dest
        })
        // When all the files are uploaded
        if (--nbFiles === 0) {
          fs.rmdirSync('.tmp')
          stream.end()
        }

    }

    // Upload each file
    this.files.forEach(function(file) {
      file.src.forEach(function(src) {
        // GZip the file
        if (file.gzip) {
          var gzip = zlib.createGzip()
            , input = fs.createReadStream(src)
            , outputSrc = '.tmp/' + src
            , output = fs.createWriteStream(outputSrc)

          input.pipe(gzip).pipe(output)
          output.on('close', function() {
            uploadFile(src, file.dest)
          })
        } else {
          uploadFile(src, file.dest)
        }
      })
    })
  })
}
