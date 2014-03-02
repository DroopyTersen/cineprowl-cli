CineProwl Command Line Utility
=============


####FileSync 
`cineprowl -s`

1. Iterates through all the files in my video libraries and finds any movie files that aren't already in the database
2. Retrieves that movie file's information using themoviedb.org REST api 
3. Screen scrapes the IMDB rating
4. Inserts the movie into a MongoDb database

####VlcReceiver
`cineprowl -v 5000`

Launches an http proxy that will except requests at the specified port.  The proxy handles launching and closing Vlc Media player and passes all other requests along to the Vlc HTTP endpoint. Don't forget to open the port in your firewall and forward it on your router.

#####Play
Launches Vlc Media player in fullscreen playing the passed in file with the the HTTP endpoint enabled.

`http://:password@localhost:5000/play?filepath=myfile.avi`

#####Stop
Closes Vlc Media Player

`http://:password@localhost:5000/stop`

#####Vlc Controls
See my [Npm module](http://github.com/DroopyTersen/droopy-vlc) for controlling Vlc Media player over Http.


####TorrentHunter
`cineprowl -t`

1. Screen scrapes the first 20 pages of http://kickass.to/movies/
2. Extracts the movie title from the torrent name
3. Removes undesirables (like CAM's or TS's)
4. Checks to see if that movie is already in the database
5. Outputs the list

Note: TorrentHunter requires phantomjs to be installed globally
`npm install -g phantomjs`


```
PS C:\GitWip> cineprowl --help

  Usage: cineprowl [options]

  Options:

    -h, --help                  output usage information
    -V, --version               output the version number
    -t, --torrents [pageCount]  Search torrents
    -s, --sync                  Sync video libraries
    -m, --mongo [action]        Start or stop mongo server
    -w, --web                   Start the web server
    -v, --vlc [port]            Start the VLC receiver
```


