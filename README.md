# grunt-s3-sync

> A streaming interface for uploading multiple files to S3

## Getting Started
This plugin requires Grunt `~0.4.1`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-s3-sync --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-s3-sync');
```

## The "s3-sync" task

### Overview
In your project's Gruntfile, add a section named `s3-sync` to the data object passed into `grunt.initConfig()`.

### Options

#### options.key
Type: `String`

Your AWS access key, **mandatory**.

#### options.secret
Type: `String`

Your AWS secret, **mandatory**.

#### options.bucket
Type: `String`

The bucket to upload to, **mandatory**.

#### options.concurrency
Type: `Number`

The maximum amount of files to upload concurrently.

#### options.retries
Type: `Number`

The maximum number of times to retry uploading a file before failing. By default the value is 7.

#### options.headers
Type: `Object`

Additional headers to include on each file.

#### options.db
Type: `Function`

A [level](http://github.com/level/level) database to use as a local cache
for file uploads. This way, you can minimize the frequency you have to
hit S3 and speed up the whole process considerably.

Needs to be passed as a function that returns the db instance - otherwise
it'll get mangled by grunt's option API.

#### files.gzip
Type: `Boolean`

Pass this to a files object to enable gzip compression, e.g.

``` javascript
{
  root: __dirname
  src: '/**/*.html',
  dest: '/',
  gzip: true
}
```

#### files.compressionLevel
Type: `Number`

This argument will set compression to the desired level. The default is 6 and the maximum you can set is 9. This is only useful if `gzip: true`. You can find more about this [here](http://zlib.net/manual.html#Advanced).

#### files.root
Type: `String`

This is a mandatory argument. Pass this to a files object to determine the "root" directory for uploads, e.g.
the following will upload the files in `build` to the bucket's root:

The purpose is to determine the base path of the files so that relative paths from that base path `root` can be preserved when uploaded to S3. Without it, we don't know relative to what to make the paths on S3.

``` javascript
{
  root: __dirname + 'build'
  src: 'build/**'
  dest: '/'
}
```

#### Note
The project is based on [knox](http://ghub.io/knox), all knox options are available in the
`options` object.

### Usage Examples

Template strings in grunt will allow you to easily include values from other files. The below example
demonstrates loading aws settings from another file, Where grunt-aws.json is just a json key:value file like package.json. (Special thanks to @nanek) This is **important because you should never check in your S3 credentials to github! Load them from an external file that is outside of the repo.**

```js
grunt.initConfig({
  aws: grunt.file.readJSON('~/grunt-aws.json'),
  's3-sync': {
    options: {
        key: '<%= aws.key %>'
      , secret: '<%= aws.secret %>'
      , bucket: '<%= aws.bucket %>'
      , db    : db
    },
    your_target: {
        files: [
            {
                root: __dirname
              , src:  'tasks/**/*.js'
              , dest: 'js/'
              , gzip: true
            },
            {
                root: 'dist'
              , src: ['dist/**', '!dist/img/**']  // Don't compress images!
              , dest: '/<%= pkg.version %>/'
              , gzip: true
              , compressionLevel: 9  // Max compression
            },
            {
                root: __dirname
              , src:  'Gruntfile.js'
              , dest: 'Gruntfile.js'
            }
        ]
    },
  },
})
```


## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style.

## Release History
* 2013-08-07   v0.2.1   New s3-sync version
* 2013-07-25   v0.1.1   Edit gzipping handling
* 2013-07-25   v0.1.0   First release
