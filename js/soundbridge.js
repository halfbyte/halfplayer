
// Returns the appropriate soundbridge implementation object, although you will
// probably not need that object later in your code.
// 
// * channels = Number of channels (1-2)
// * sampleRate = Sample rate of the sound (i.e. 441000)
// * pathForFallback = Path to the soundbridge folder to load fallback flash
// * onReady = a callback that will be called if soundbridge is ready to operate. 
//   * You should call setCallback from that callback. It's like inception.
//   * The callback gets the soundbridge object as a parameter (here, it gets deep)


window.SoundBridge = function(channels, sampleRate, pathForFallback, onReady) {  
  if (typeof webkitAudioContext !== 'undefined' || typeof AudioContext !== 'undefined') {
    return SoundBridgeWebAudio(channels, sampleRate, onReady);
  } else if ((typeof Audio !== 'undefined') && (audio = new Audio()) && audio.mozSetup) {
    return SoundBridgeAudioData(channels, sampleRate, onReady);
  } else {
    return SoundBridgeFallback(channels, sampleRate, pathForFallback, onReady);
  }
  
};

// a prototype to enhance the specific implementations.

function SoundBridgePrototype() {
  this.playing = false;
}

// console.log wrapper

SoundBridgePrototype.prototype.log = function(text) {
  if (typeof console !== 'undefined' && console.log)
    console.log(text);
};

// Starts playback

SoundBridgePrototype.prototype.play = function() {
  this.playing = true;
};

// Stops playback

SoundBridgePrototype.prototype.stop = function() {
  this.playing = false;
};

// Web Audio is a standard currently discussed in the audio working group
// and currently implemented in Chrome (can be enabled via about:flags) on OS X
// Windows and Linux support is, probably, in the canary builds. Haven't tested
// that, though.
//
// See [SpecificationProposal](https://dvcs.w3.org/hg/audio/raw-file/tip/webaudio/specification.html).

var SoundBridgeWebAudio = function(channels, sampleRate, onReady) {
  var that = new SoundBridgePrototype();
  var jsNode;
  var bufferCounter = 0;
  var callback;
  var channelData = [];
  
  // Sets the callback function for audio processing
  // callback gets three parameters:
  // 
  // * The soundbridge object itself (to call addBuffer on it)
  // * The number of samples the callback should calculate
  // * The number of channels the callback needs to fill
  
  that.setCallback = function(fun) {
    callback = fun;
    var i;
    jsNode.onaudioprocess = function(event) {
      bufferCounter = 0;
      jsNodeOutputBuffer = event.outputBuffer;
      for(i=0;i<channels;i++) {
        channelData[i] = jsNodeOutputBuffer.getChannelData(i);
      }        
      if (that.playing) {
        callback(that, channelData[0].length, channels);        
      } else {        
        var len = channelData[0].length;
        for(i=0;i<len;i++) {
          for(c=0;c<channels;c++) {
            channelData[c][i] = 0.0;
          }
        }
      }  
    };
  };
  
  // Add one Sample to Buffer. The function takes a float value per Channel, so
  // for a stereo signal, thou shalt call the function with two parameters
  // Will throw an exception if called with the wrong number of channels.
  
  that.addToBuffer = function() {
    if(arguments.length !== channels) {
      throw("Given wrong number of arguments, not matching channels");
    }
    for(var i=0;i<channels;i++) {
      channelData[i][bufferCounter] = arguments[i];
    }
    bufferCounter++;
  };

  // The inital builds of a WebAudio enabled webkit had the AudioContext
  // object without a namespace. I'll leave that it for now for the
  // vague hope that one day it will be standardised and the
  // namespace will be taken out again.
  // If other Browsers will get WebAudio support, this will need more
  // if-clauses, of course.
  
  if (typeof webkitAudioContext !== 'undefined') {
    context = new webkitAudioContext();
    jsNode = context.createJavaScriptNode(4096, 0, channels);
    jsNode.connect(context.destination);
    that.log("I'm on webkit.");
  } else if (typeof AudioContext !== 'undefined') {
    context = new AudioContext();
    jsNode = context.createJavaScriptNode(8192, 0, channels);
    jsNode.connect(context.destination);
    that.log("I'm on web audio api, not namespaced");
  } else {
    throw("No AudioContext found");
  }
  
  // Return the public object.
  if (typeof onReady === 'function') onReady(that);
  return that;  
};

// The AudioData API from Mozilla/Firefox is a very crude, but functional
// API that was introduced in Firefox 4 and therefore earns the prize of
// the first production ready Audio API.
// 
// Soundbridge wraps the API in a callback based API.
//
// See [API Docs](https://wiki.mozilla.org/Audio_Data_API).

var SoundBridgeAudioData = function(channels, sampleRate, onReady) {
  var that = new SoundBridgePrototype();
  var bufferCounter = 0;
  var callback;
  var soundData;
  var preBufferSize = 0;
  var currentWritePosition = 0;
  var tail = null;

  // Sets the callback function for audio processing
  // callback gets three parameters:
  // 
  // * The soundbridge object itself (to call addBuffer on it)
  // * The number of samples the callback should calculate
  // * The number of channels the callback needs to fill
    
  that.setCallback = function(fun) {
    callback = fun;

    // write data and check if all data was written, if not,
    // create tail that will be written next time.
    
    var writeData = function(data) {
      var written;
      if(data) {  
        written = audio.mozWriteAudio(data);
        currentWritePosition += written;
        if(written < data.length) {
          // Not all the data was written, saving the tail...
          tail = data.slice(written);
          return true;
        }
        tail = null;
      }
      return false;
    };
    
    // Will be called every 100 ms and will 
    // call the callback if sound data is needed to fill buffer
    // Now we have a callback based API. WIN!
    
    var timerFunction = function() {
      if (!that.playing) return;
      var remainder = false;
      // try to write tail, return if tail wasn't written completely.
      if(writeData(tail)) return;

      // Check if we need add some data to the audio output.
      var currentPosition = audio.mozCurrentSampleOffset();
      var available = Math.min(currentPosition + prebufferSize - currentWritePosition, 22050 * channels);
      if(available > 0) {
        // Request some sound data from the callback function.
        soundData = new Float32Array(available * channels);
        bufferCounter = 0;
        callback(that, soundData.length / channels, channels);
        writeData(soundData);
      }
    };  
    window.setInterval(timerFunction,100);
  };
  
  // Add one Sample to Buffer. The function takes a float value per Channel, so
  // for a stereo signal, thou shalt call the function with two parameters
  // Will throw an exception if called with the wrong number of channels.
  
  // I told you the API is crude: For every sample, you'll need to write
  // _channel_ floats to the buffer.
  
  that.addToBuffer = function() {
    for(var i=0;i<channels;i++) {
      soundData[bufferCounter] = arguments[i];
      bufferCounter++;
    }
  };
    
  if ((typeof Audio !== 'undefined') && (audio = new Audio()) && audio.mozSetup) {
    that.log("I'm on AudiData (Firefox etc.)");
    audioElement = audio;
    audioElement.mozSetup(channels, sampleRate);
    prebufferSize = sampleRate / 2;
  } else {
    throw("No Audio Object found");
  }
  if (typeof onReady === 'function') onReady(that);
  return that;  
};

// If all else fails, use Flash if possible.

var SoundBridgeFallback = function(channels, sampleRate, pathForFallback, onReady) {
  var that = new SoundBridgePrototype();
  var flashObject = null;
  var flashBuffer = "";
  var callback = null;
  
  // Starts playing. Since callbacks are handled by the flash object in this case,
  // the prototype needs to be overwritten.
  
  that.play = function() {
    that.playing = true;
    flashObject.play();
  };

  // Stops playing. See above.
  
  that.stop = function() {
    that.playing = false;
    flashObject.stop();
  };
  
  // Utility function to get the movie instance on every browser.
  
  var getMovie = function(movieName) {
    if (navigator.appName.indexOf("Microsoft") != -1) {
      return window[movieName];
    } else {
      return document[movieName];
    }
  };

  // Appending the flash movie that will handle the fallback sound output to the document.
  // The flash movie should call the soundBridgeOnReady callback, which then will call
  // the onReady callback given to the constructor. This is all very confusing.
  
  var fallThrough = function() {
    
    window.__soundBridgeOnReady = function() {
      if (typeof onReady === 'function') onReady(that);
    };
    
    playerCode = '<object classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" width="200" height="30" id="soundbridgeFlash" align="middle">';
    playerCode += '<param name="movie" value="' + pathForFallback + '/soundbridge.swf"/>';
    playerCode += '<param name="allowScriptAccess" value="always" />';
    playerCode += '<param name="quality" value="high" />';
    playerCode += '<param name="scale" value="noscale" />';
    playerCode += '<param name="salign" value="lt" />';
    playerCode += '<param name="bgcolor" value="#ffffff"/>';
    playerCode += '<param name="FlashVars" value="onready=__soundBridgeOnReady"/>';
    playerCode += '<embed src="' + pathForFallback + '/soundbridge.swf?no_one=is_true" bgcolor="#ffffff" FlashVars="onready=__soundBridgeOnReady" width="200" height="30" name="soundbridgeFlash" quality="high" align="middle" allowScriptAccess="always" type="application/x-shockwave-flash" pluginspage="http://www.macromedia.com/go/getflashplayer" />';
    playerCode += '</object>';
    var body = document.getElementsByTagName("body")[0];
    body.innerHTML += playerCode;
    flashObject = getMovie('soundbridgeFlash');
  };

  // This seems like a really bad idea, but is the fastest way I could find.
  // I haven't tried native base64 encoding using btoa and atob, though.

  var encodeHex = function(word) {
    var HEX = "0123456789ABCDEF";
    var buffer = "";
    buffer += HEX.charAt(word & 0xF);
    buffer += HEX.charAt((word >> 4) & 0xF);
    buffer += HEX.charAt((word >> 8) & 0xF);
    buffer += HEX.charAt((word >> 12) & 0xF);
    return buffer;
  };

  // Sets the callback function for audio processing
  // callback gets three parameters:
  // 
  // * The soundbridge object itself (to call addBuffer on it)
  // * The number of samples the callback should calculate
  // * The number of channels the callback needs to fill
  
  that.setCallback = function(fun) {
    callback = fun;
    window.__soundbridgeGenSound = function(bufferSize, bufferPos) {
      flashBuffer = "";
      var durStart = new Date().getTime();
      callback(that, bufferSize, channels);
      return flashBuffer;
    };
    flashObject.setCallback("__soundbridgeGenSound");
  };
  
  // Add one Sample to Buffer. The function takes a float value per Channel, so
  // for a stereo signal, thou shalt call the function with two parameters
  // Will throw an exception if called with the wrong number of channels.
  // please note that the flash fallback currently only plays back one channel. Yes, stupid, I know.
  
  that.addToBuffer = function() {
    var word = Math.round((arguments[0] * 32768.0 * 0.5) + 32768.0);
    flashBuffer += encodeHex(word);    
  };
  
  fallThrough();
  that.log("Falling Through to Flash");
  
  return that;
      
};
