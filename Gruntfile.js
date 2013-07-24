/*
 * grunt-g
 * https://github.com/smallmultiples/grunt-s3-sync
 *
 * Copyright (c) 2013 Small Multiples
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        // Configuration to be run
        's3-sync': {
            options: {},
            stage: {
                files: [
                    {
                        src:  'tasks/**/*.js',
                        dest: 'js/',
                        gzip: true
                    },
                    {
                        src:  'Gruntfile.js',
                        dest: 'Gruntfile.js'
                    },
                    {
                        src:  'foo/bar',
                        dest: 'none'
                    }
                ]
            }
        },

        // Unit tests.
        nodeunit: {
            tests: ['test/*_test.js']
        }

    })

    // Actually load this plugin's task(s).
    grunt.loadTasks('tasks')

    // plugin's task(s), then test the result.
    grunt.registerTask('default', ['s3-sync:stage'])

}