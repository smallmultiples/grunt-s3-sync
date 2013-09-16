/*
 * grunt-contrib-uglify
 * https://gruntjs.com/
 *
 * Copyright (c) 2013 Small Multiples
 * Licensed under the MIT license.
 */

'use strict';

// External libs.
var through = require('through')
  , s3sync = require('s3-sync')
  , rimraf = require('rimraf')
  , async = require('async')
  , path = require('path')
  , zlib = require('zlib')
  , url = require('url')
  , fs = require('fs')

module.exports = function(grunt) {
  grunt.registerMultiTask('s3-sync', 'A streaming interface for uploading multiple files to S3.', function() {
    var options = this.options()
      , tmp = path.resolve('.tmp')
      , done = this.async()
      , db = null

    options.headers = options.headers || {}
    if (options.gzip) {
      options.headers['Content-Encoding'] = 'gzip'
    }

    if (options.db) {
      db = options.db()
    }

    options.hashKey = function(details) {
      return details.orig
    }

    // Init the stream
    var stream = s3sync(db, options)

    // Log upload message
    stream.on('data', function(file) {
      if (file.cached) {
        grunt.log.ok('[cached] ' + file.url)
      } else
      if (file.fresh) {
        grunt.log.success('>> [uploaded] ' + file.url)
      } else {
        grunt.log.ok('[exists] ' + file.url)
      }

      if (--fileCount > 0) return

      rimraf(tmp, function() {
        stream.end()
        done()
      })
    })

    stream.on('fail', function(err) {
      grunt.log.fail(err.message)
    })

    var actualFiles = this.files.map(function(set) {
      return set.src.filter(function(file) {
        return grunt.file.isFile(file)
      })
    }).reduce(function(a, b) {
      return a.concat(b)
    }, [])

    var fileCount = actualFiles.length

    // Handle the upload for each files
    var uploadFile = function(src, orig, dest) {
      stream.write({
          src: src
        , dest: dest
        , orig: orig
      })
    }

    // Upload each file
    this.files.forEach(function(file) {
      var list = file.src.filter(function(file) {
        return actualFiles.indexOf(file) !== -1
      })

      async.mapLimit(list, 25, function(src, next) {
        var absolute = path.resolve(src)
        var dest = url.resolve(file.dest, path.relative(file.root, src))
        var useGzip = 'gzip' in file ? !!file.gzip : !!options.gzip
        var gzipCompLevel = 'compressionLevel' in file
          ? file.compressionLevel
          : options.compressionLevel

        if (!useGzip) {
          uploadFile(absolute, absolute, dest)
          return next()
        }

        // GZip the file
        var outputSrc = path.resolve(tmp, src)

        grunt.file.mkdir(path.dirname(outputSrc))

        if(typeof gzipCompLevel === 'undefined') {
          gzipCompLevel = 9
        }

        var gzip = zlib.createGzip({ level: gzipCompLevel })
          , input = fs.createReadStream(absolute)
          , output = fs.createWriteStream(outputSrc)

        input
          .pipe(gzip)
          .pipe(output)
          .once('error', next)
          .once('close', function() {
            uploadFile(outputSrc, absolute, dest)
            next()
          })
      }, function(err) {
        if (err) throw err
      })
    })
  })
}
