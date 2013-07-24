createQueue = require('queue-async')
backoff = require('backoff')
es = require('event-stream')
crypto = require('crypto')
xtend = require('xtend')
mime = require('mime')
once = require('once')
knox = require('knox')
url = require('url')
fs = require('fs')

module.exports = s3syncer

s3syncer = (db, options) ->
    unless options
        options = db or {}
        db = false

    options.concurrency = options.concurrency or 16
    options.headers = options.headers or {}
    options.cacheSrc = options.cacheSrc or __dirname + '/.sync'
    options.cacheDest = options.cacheDest or '/.sync'

    client = knox.createClient(options)
    queue = createQueue(options.concurrency)
    region = if options.region is 'us-standard' then false else options.region
    secure = options.secure or !('secure' in options)
    subdomain = if region then 's3-' + region else 's3'
    protocol = if secure then 'https' else 'http'

    stream = es.map((data, next) ->
        queue.defer((details, done) ->
            details.fullPath = details.fullPath or details.src
            details.path = details.path or details.dest

            syncFile(details, (err) ->
                if err
                    return next(err)
                else
                    done()
                    return next(null, details)
            )
        , data)
    )

    stream.getCache = getCache
    stream.putCache = putCache

    syncFile = (details, next) ->
        absolute = details.fullPath
        relative = details.path
        destination = url.resolve(
            protocol + '://' + subdomain + '.amazonaws.com/' + options.bucket + '/'
            details.path
        )

        hashFile(absolute, (err, md5) ->
            if err
                return next(err)
            details.md5 = md5
            details.url = destination
            details.fresh = false
            details.cached = false

            unless db
                return checkForUpload(next)

            key = 'md5:' + absolute

            db.get(key, (err, result) ->
                unless err && result is md5
                    details.cached = true
                    return next(null, details)
                checkForUpload((err) ->
                    if err
                        return next(err)
                    db.put(key, md5, next)
                )
            )
        )

        checkForUpload = (next) ->
            client.headFile(relative, (err, res) ->
                if err
                    return next(err)
                if res.statusCode is 404 or res.headers.etag isnt '"' + details.md5 + '"'
                    return uploadFile(details, next)
                if res.statusCode >= 300
                    return next(new Error('Bad status code: ' + res.statusCode))
                return next(null, details)
            )

    uploadFile = (details, next) ->
        absolute = details.fullPath
        relative = details.path
        fib = backoff.fibonacci(
            initialDelay: 1000
        )

        details.fresh = true

        fib.failAfter(7)
        fib.on('fail', ->
            next(lasterr or new Error('unknown error'))
        ).on('ready', ->
            headers = xtend(
                'x-amz-acl': 'public-read-write'
                'Content-Type': mime.lookup(absolute)
            , options.headers)

            client.putFile(absolute, relative, headers, (err, res) ->
                unless err
                    if res.statusCode < 300
                        return next(null, details)
                    err = new Error('Bad status code: ' + res.statusCode)

                lasterr = err
                fib.backoff()
            )
        ).backoff()

    getCache = (callback) ->
        callback = once(callback)

        client.getFile(options.cacheDest, (err, res) ->
            if err
                return callback(err)
            if res.statusCode is 404
                return callback(null)

            es.pipeline(
                res
                es.split()
                es.parse()
                db.createWriteStream()
            ).once('close', callback)
             .once('error', callback)
        )


    putCache = (callback) ->
        callback = once(callback)

        db.createReadStream()
            .pipe(es.stringify())
            .pipe(fs.createWriteStream(options.cacheSrc))
            .once('error', callback)
            .once('close', ->
                client.putFile(options.cacheSrc, options.cacheDest, (err) ->
                    if err
                        return callback(err)
                    fs.unlink(options.cacheSrc, callback)
                )
        )

    return stream

hashFile = (filename, callback) ->
    hash = crypto.createHash('md5')
    done = false

    fs.createReadStream(filename).on('data', (d) ->
        hash.update(d)
    ).once('error', (err) ->
        unless done
            callback(err)
        done = true
    ).once('close', ->
        unless done
            callback(null, hash.digest('hex'))
        done = true
    )