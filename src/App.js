import React from "react";
import logo from "./logo.svg";
import "./App.css";
import Recorder from "recorder-js";
// import Recorder from "opus-recorder";
import { get } from "lodash";

import Input from "./Input";
import Axios from "axios";

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
audioContext.resume();

class App extends React.PureComponent {
  state = {
    recording: false,
    audio: null
  };

  audioChunks = [];

  componentDidMount() {
    this.recorder = new Recorder(audioContext);
    console.log(this.recorder);
  }

  recordAudio = () => {
    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        // console.log(stream);
        this.recorder.init(stream);
        this.recorder.start().then(() => {
          this.setState({ recording: true });
        });

        setTimeout(this.stopRecording, 3000);
      });
    } else {
      alert("not supported");
    }
  };

  stopRecording = () => {
    // this.setState({ recording: false }, () => this.mediaRecorder.stop());
    this.recorder.stop().then(({ blob, buffer }) => {
      console.log(blob);
      this.setState({ recording: false });
      this.transformToText(blob);
    });
  };

  transformToText = blob => {
    const reader = new FileReader();
    console.log(reader);
    reader.onloadend = data => {
      console.log(data);
      const base64 = data.target.result.split(",")[1];

      Axios.post(
        "https://speech.googleapis.com/v1/speech:recognize?key=AIzaSyDfTlXpwXfjnlSG1ZxxiXK0quzKbQ7HuvU",
        {
          config: {
            languageCode: "pl-PL",
            encoding: "LINEAR16",
            // sampleRateHertz: 16000,
            audioChannelCount: 2,
            enableSeparateRecognitionPerChannel: true
          },
          audio: {
            content: base64
          }
        }
      )
        .then(data => {
          console.log(data);
          this.setState({
            text: get(data, "data.results.[0].alternatives.[0].transcript")
          });
          console.log(
            get(data, "data.results.[0].alternatives.[0].transcript")
          );
        })
        .catch(error => console.log(error));
    };

    reader.readAsDataURL(blob);
  };

  playAudio = () => {
    this.state.audio.play();
  };

  onInputChange = e => {
    this.setState({ text: e.target.value });
  };

  render() {
    console.log(this.state.recording);
    return (
      <div className="App">
        <Input value={this.state.text} onInputChange={this.onInputChange} />
        <button onClick={this.recordAudio}>Start</button>
      </div>
    );
  }
}

export default App;
