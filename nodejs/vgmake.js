
var fs = require('fs'), 
    path = require( 'path' ),
    lzString = require( 'lz-string' ),
    util = require("util"),
    mime = require("mime"),
    request = require('request');

// --- Utils

String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

// --- Test if first argument is valid vgmakefile

var vgPath=process.argv.length > 2 && process.argv[2].endsWith("vg") ? process.argv[2] : undefined;
var vgMF, vgMFS;

if ( vgPath ) {
    vgMF = fs.readFileSync( vgPath );
    vgMFS = vgMF.toString();
} else {
    printUsage();
    return;
}

var dir=path.dirname( vgPath );

// ----------------------------------------------------------------------- Create the .vide file

var out={};
var lines=vgMFS.split(/\r\n|\r|\n/);
lines=cleanArray( lines );

// --- Get the project name

var name=extractTokenList( lines, "name" );

if ( !name || !name.length ) { console.log( "Error \"name\" parameter is missing." ); return; }
out.name=lzString.compressToBase64( name[0] );

// --- Include all optional parameters

addOptionalParams( out, lines, "url", "version", "description", "title", "domain", "author", "keywords", "webBorderColor", "defaultSkin" );

// --- Sources

out.sources={};
var sources=extractTokenList( lines, "sources", "," );
for ( var i=0; i < sources.length; ++i ) 
{
    var source=fs.readFileSync( path.join( dir, sources[i] ) ).toString();
    if ( !source || !source.length ) { console.log( "Error: source file \"" + sources[i] + "\" not found." ); return; }

    var name;

    if ( source.indexOf( "function vgMain" ) !== -1 ) name="main.js";
    else name=path.basename( sources[i] );

    out.sources[name]=lzString.compressToBase64( source );
}

// --- Images

out.images={};
var images=extractTokenList( lines, "images", "," );
for ( var i=0; i < images.length; ++i ) 
{
    var image=base64Image( path.join( dir, images[i] ) );
    if ( !image || !image.length ) { console.log( "Error: image file \"" + images[i] + "\" not found." ); return; }

    var name=path.basename( images[i] );
    out.images[name]=image;
}

// --- SVGs

out.svg={};
var svgs=extractTokenList( lines, "svg", "," );
for ( var i=0; i < svgs.length; ++i ) 
{
    var svg=fs.readFileSync( path.join( dir, svgs[i] ) ).toString();
    if ( !svg || !svg.length ) { console.log( "Error: SVG file \"" + svg[i] + "\" not found." ); return; }

    var name=path.basename( svgs[i] );
    out.svg[name]=lzString.compressToBase64( svg );
} 

// --- Html

out.texts={};
var html=extractTokenList( lines, "html", "," );
for ( var i=0; i < html.length; ++i ) 
{
    var source=fs.readFileSync( path.join( dir, html[i] ) ).toString();
    if ( !source || !source.length ) { this.errorLog( "Error: html file \"" + html[i] + "\" not found." ); return; }

    var name=path.basename( html[i], '.html' );
    out.texts[name]=lzString.compressToBase64( source );
} 

// --- Google Analytics

out.googleAnalytics="";
var ga=extractTokenList( lines, "googleAnalytics" );
if ( ga.length ) {
    var source=fs.readFileSync( path.join( dir, ga[0] ) ).toString();
    out.googleAnalytics=lzString.compressToBase64( source );
}

// --- Fav Icon

var webIcon=extractTokenList( lines, "webIcon" );
if ( webIcon.length ) {
    var webIcon=fs.readFileSync( path.join( dir, webIcon[0] ) ).toString();
} 

// --- Save it

outFile="VG.App=" + JSON.stringify( out );

var videPath=path.join( dir, path.basename( vgPath ).slice(0, -2) + "vide" );
fs.writeFile( videPath, outFile );

console.log( "Compiled vide file written to " + videPath );

// ----------------------------------------------------------------------- Backend Functions

var userName=undefined, password=undefined;
var loginActions=[];

var i=2;
while ( i < process.argv.length ) 
{
    var text=process.argv[i];
    
    if ( text === "-u" ) { userName=process.argv[i+1]; ++i; }
    else
    if ( text === "-p" ) { password=process.argv[i+1]; ++i; }
    else
    if ( text === "-create" ) loginActions.push( "create" );
    else
    if ( text === "-update" ) loginActions.push( "update" );
    else
    if ( text === "-build" ) loginActions.push( "build" );
    else
    if ( text === "-downloads" ) loginActions.push( "downloads" );
    else
    if ( text === "-icons" ) loginActions.push( "icons" );

    ++i;
}

if ( userName && password ) {

var parameters={username : userName, password : password };

sendBackendRequest( "/user/login", parameters, function( response ) {

        if ( response.status === "ok" && response.user.username && response.user.username.length )
        {
            console.log( "- Logged in successfully!" );
            nextLoginAction();
        }

    }, "POST" );
}

function nextLoginAction()
{
    if ( loginActions.length )
    {
        var action=loginActions[0];
        loginActions.splice( 0, 1 );

        if ( action === "create" )
            create();
        else
        if ( action === "update" )
            update();
        else
        if ( action === "build" )
            build();
        else          
        if ( action === "downloads" )
            downloads();
        else
        if ( action === "icons" )
            icons();        
    }
};

function create()
{
    var vide=outFile; var data=out;

    if ( !data.url ) {
        console.log( "Error: \"url\" parameter is missing.");
        return;
    }

    var parameters={};
    parameters.name=lzString.decompressFromBase64( data.name );
    parameters.version=lzString.decompressFromBase64( data.version );
    parameters.url=lzString.decompressFromBase64( data.url );
    parameters.title=lzString.decompressFromBase64( data.title );
    parameters.domain=lzString.decompressFromBase64( data.domain );
    parameters.file=vide;

    sendBackendRequest( "/app/create", parameters, function( response ) {
        var type, message;

        if ( response.status == "ok" )
        {
            console.log( "- Application created successfully." );
            nextLoginAction();
        }
        else
        if ( response.status == "error" )
            console.log( "- Application creation failed!" );

    }.bind(this), "POST" );
};

function update()
{
    var vide=outFile; var data=out;

    console.log( "- Trying to acquire application ID from Server (" + lzString.decompressFromBase64( data.url ) + ")..." );

    var url="/app/check/?url=" + lzString.decompressFromBase64( data.url );
    sendBackendRequest( url, {}, function( response ) {
        var array=response.check;
        var appId=undefined;

        // --- Check if url exists on the server
        for( var i=0; i < array.length; ++i ) {
            if ( array[i].name === "url" ) {
                if ( array[i].exists ) appId=array[i].appid;
            }
        }

        if ( appId ) 
        {
            console.log( "- Acquired the application ID successfully (" + appId + ")" );
            console.log( "- Now trying to update application..." );

            var parameters={};
            parameters.name=lzString.decompressFromBase64( data.name );
            parameters.version=lzString.decompressFromBase64( data.version );
            parameters.url=lzString.decompressFromBase64( data.url );
            parameters.title=lzString.decompressFromBase64( data.title );
            parameters.domain=lzString.decompressFromBase64( data.domain );
            parameters.author=lzString.decompressFromBase64( data.author );
            parameters.keywords=lzString.decompressFromBase64( data.keywords );
            parameters.description=lzString.decompressFromBase64( data.description );
            if ( data.googleAnalytics )
                parameters.googleAnalytics=lzString.decompressFromBase64( data.googleAnalytics );
            parameters.file=vide;

            sendBackendRequest( "/app/update/" + appId, parameters, function( response ) {
                var type, message;

                if ( response.status == "ok" ) {
                    console.log( "- Application updated successfully." );
                    console.log( "- Now publishing the update..." );

                    var parameters={};
                    parameters.name=lzString.decompressFromBase64( data.name );
    
                    sendBackendRequest( "/app/publish/" + appId, parameters, function( response ) { 
                        var type, message;

                        if ( response.status == "ok" ) {
                            console.log( "Application published successfully!" );
                            console.log( "Application is now Online at: " + "http://visualgraphics.tv/apps/" + lzString.decompressFromBase64( data.url ) );
                            nextLoginAction();
                        } else console.log( "Application could not be published!");

                    }.bind(this), "POST" );
                } else
                if ( response.status == "error" )    {
                    console.log( "Application could not be updated!");
                }
            }.bind(this), "POST" );

        } else {
            console.log( "Application ID could not be acquired!");
        }

    }.bind( this ), "GET" );
};

function icons()
{
    var vide=outFile; var data=out;

    console.log( - "Trying to acquire application ID from Server (" + lzString.decompressFromBase64( data.url ) + ")..." );

    var url="/app/check/?url=" + lzString.decompressFromBase64( data.url );
    sendBackendRequest( url, "", function( response ) {
        var array=response.check;
        var appId=undefined;

        // --- Check if url exists on the server
        for( var i=0; i < array.length; ++i ) {
            if ( array[i].name === "url" ) {
                if ( array[i].exists ) appId=array[i].appid;
            }
        }

        if ( appId ) 
        {
            console.log( "- Acquired the application ID successfully (" + appId + ")." );

            var parameters={};

            if ( webIcon ) {
                console.log( "- Preparing Web Favicon..." );
                parameters["web-fav"]="data:image/ico;base64," + webIcon;
            }

            sendBackendRequest( "/app/" + appId + "/icons", parameters, function( response ) {

                if ( response.status == "ok" )
                    console.log( "- Icons uploaded successfully!" );

                nextLoginAction();
            }.bind(this), "POST" );

        } else {
            console.log( "Application ID could not be acquired!");
        }

    }.bind( this ), "GET" );
};

// ----------------------------------------------------------------------- Helper Functions

function base64Image(src) {
    var data = fs.readFileSync(src).toString("base64");
    return util.format("data:%s;base64,%s", mime.lookup(src), data);
}

function addOptionalParams( out, lines ) {
    for( var i=2; i < arguments.length; ++i ) 
    {
        var arg=arguments[i];
        var rc=extractTokenList( lines, arg );
        //console.log( arg, rc[0] );
        if ( rc && rc.length )
            out[arg]=lzString.compressToBase64( rc[0] );
    }
}

function extractTokenList( lines, token, splitToken )
{
    var rc=[];

    for( var i=0; i < lines.length; ++i ) {
        var line=String( lines[i] );

        if ( line.indexOf( "=" ) !== -1 ) {
            var arr=line.split("=");

            var left=arr[0].trim().toLowerCase();
            if ( left === token.toLowerCase() ) {

                if ( splitToken )
                {
                    var right=arr[1].split( splitToken );
                    for ( var s=0; s < right.length; ++s ) {
                        var code=right[s].trim();
                        if ( code && code.length ) rc.push( code );
                    }
                } else rc.push( arr[1].trim() );
            }
        }
    }

    return rc;
};

function cleanArray( actual )
{
    // http://stackoverflow.com/questions/281264/remove-empty-elements-from-an-array-in-javascript
    var newArray = new Array();
    for(var i = 0; i<actual.length; i++) {
        if (actual[i])
            newArray.push(actual[i]);
    }
    return newArray;
}

var cookieJar;
var headers;

function sendBackendRequest( url, parameters, callback, type, error_callback )
{
    if ( !cookieJar ) cookieJar=request.jar();

    var options = {
        method: type,
        url: "https://visualgraphics.tv" + url,
        json: true,
        body: parameters,
        jar: cookieJar
    };

    if ( headers ) options.header=headers;

    request( options, function( error, response, json ) {

        if (!error && response.statusCode == 200) {                                                     
            if ( !headers ) headers=response.headers;
            if ( callback ) callback( json );
        } else {
            console.log('Error:', json ? json.message : error );
        }
    } );
};

function printUsage()
{
    console.log( "Usage: node.js makefile -u username -p password -create -update -build -downloads -quit" ); 
    console.log( "makefile: Full path to the makefile including the makefile itself" ); 
    console.log( "-u: Username for login, only needed if you want to create, update or build" ); 
    console.log( "-p: Password for login, only needed if you want to create, update or build" ); 
    console.log( "-create: Create the application on the Server" ); 
    console.log( "-update: Update and publish the application on the server (needs to be created first)" );
    //console.log( "-build: Builds the native version of the published application" );
    //console.log( "-downloads: Lists all valid download urls for the application (issue -build first)" );
    console.log( "-icons: Uploads the icons specified in the .vg file to the server." );
};

