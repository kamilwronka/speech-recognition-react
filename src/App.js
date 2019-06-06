import React, { PureComponent } from "react";

const SAMPLE_RATE = 48000;
const SAMPLE_SIZE = 16;

class App extends PureComponent {
  state = {
    recording: false
  };

  componentDidMount() {
    // this.audioContext.resume();
  }

  transcribeAudio = () => {
    this.audioContext = new AudioContext();
    var audioPromise = navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        channelCount: 1,
        sampleRate: {
          ideal: SAMPLE_RATE
        },
        sampleSize: SAMPLE_SIZE
      }
    });

    audioPromise
      .then(micStream => {
        var microphone = this.audioContext.createMediaStreamSource(micStream);
        this.analyser = this.audioContext.createAnalyser();
        microphone.connect(this.analyser);
      })
      .catch(console.log.bind(console));

    this.initWebsocket(audioPromise);
  };

  initWebsocket = audioPromise => {
    var socket;
    var sourceNode;

    // Create a node that sends raw bytes across the websocket
    var scriptNode = this.audioContext.createScriptProcessor(4096, 1, 1);
    // Need the maximum value for 16-bit signed samples, to convert from float.
    const MAX_INT = Math.pow(2, 16 - 1) - 1;
    scriptNode.addEventListener("audioprocess", function(e) {
      var floatSamples = e.inputBuffer.getChannelData(0);
      // The samples are floats in range [-1, 1]. Convert to 16-bit signed
      // integer.
      socket.send(
        Int16Array.from(
          floatSamples.map(function(n) {
            return n * MAX_INT;
          })
        )
      );
    });

    const newWebsocket = () => {
      var websocketPromise = new Promise(function(resolve, reject) {
        var socket = new WebSocket("ws://localhost:4000");
        socket.addEventListener("open", resolve);
        socket.addEventListener("error", reject);
      });

      Promise.all([audioPromise, websocketPromise])
        .then(values => {
          var micStream = values[0];
          socket = values[1].target;

          // If the socket is closed for whatever reason, pause the mic
          socket.addEventListener("close", function(e) {
            console.log("Websocket closing..");
          });
          socket.addEventListener("error", function(e) {
            console.log("Error from websocket", e);
          });

          const startByteStream = e => {
            // Hook up the scriptNode to the mic
            sourceNode = this.audioContext.createMediaStreamSource(micStream);
            sourceNode.connect(scriptNode);
            scriptNode.connect(this.audioContext.destination);
          };

          // Send the initial configuration message. When the server acknowledges
          // it, start streaming the audio bytes to the server and listening for
          // transcriptions.
          // socket.addEventListener(
          //   "message",
          //   function(e) {
          //     socket.addEventListener("message", onTranscription);
          //     console.log("bajlando XDXD");
          //     startByteStream(e);
          //   },
          //   { once: true }
          // );
          this.setState({ recording: true });
          startByteStream();
          socket.addEventListener("message", onTranscription);

          // socket.send(JSON.stringify({ sampleRate: context.sampleRate }));
        })
        .catch(console.log.bind(console));
    };

    function closeWebsocket() {
      scriptNode.disconnect();
      if (sourceNode) sourceNode.disconnect();
      if (socket && socket.readyState === socket.OPEN) socket.close();
    }

    function toggleWebsocket(e) {
      var context = e.target;
      if (context.state === "running") {
        newWebsocket();
      } else if (context.state === "suspended") {
        closeWebsocket();
      }
    }

    /**
     * This function is called with the transcription result from the server.
     */
    function onTranscription(e) {
      var result = JSON.parse(e.data);

      console.log(result);

      // if (result.alternatives_) {
      //   transcript.current.innerHTML = result.alternatives_[0].transcript_;
      // }
      // if (result.isFinal_) {
      //   transcript.current = document.createElement("div");
      //   transcript.el.appendChild(transcript.current);
      // }
    }

    // When the mic is resumed or paused, change the state of the websocket too
    this.audioContext.addEventListener("statechange", toggleWebsocket);
    // initialize for the current state
    toggleWebsocket({ target: this.audioContext });
  };

  stopTranscribing = () => {
    this.setState({ recording: false }, () => {
      this.audioContext.suspend();
    });
  };

  render() {
    return (
      <button
        onClick={
          this.state.recording ? this.stopTranscribing : this.transcribeAudio
        }
      >
        {this.state.recording ? "Stop" : "Start"}
      </button>
    );
  }
}

export default App;
