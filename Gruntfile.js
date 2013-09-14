/*
 * grunt-g
 * https://github.com/smallmultiples/grunt-s3-sync
 *
 * Copyright (c) 2013 Small Multiples
 * Licensed under the MIT license.
 */

'use strict';


module.exports = function(grunt) {
    // You can use a level (http://github.com/level/level) database
    // to use as a local cache for file uploads. This way, you can minimize
    // the frequency you have to hit S3 and speed up the whole process considerably.
    var db = require('level')('.cache')

    // Project configuration.
    grunt.initConfig({
        // Configuration to be run
        's3-sync': {
            options: {
                  key   : 'KEY'
                , secret: 'SECRET'
                , bucket: 'BUCKET'
                , db    : db
            }
          , stage: {
                options: {
                    bucket: 'BUCKET_STAGING'
                }
              , files: [
                    {
                        src:  'tasks/**/*.js'
                      , dest: 'js/'
                      , gzip: true
                    },
                    {
                        src:  'Gruntfile.js'
                      , dest: 'Gruntfile.js'
                    },
                    {
                        src 'foo/**/*.css'
                        dest: 'css/'
                        gzip: true
                        compressionLevel: 9
                    },
                    {
                        src:  'foo/bar'
                      , dest: 'none'
                    }
                ]
            }
        }
    })

    // Actually load this plugin's task(s).
    grunt.loadTasks('tasks')

    // plugin's task(s), then test the result.
    grunt.registerTask('default', ['s3-sync:stage'])

}