import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import { Howl } from 'howler';
import soundURL from './assets/hey_sound.mp3';
import { initNotifications, notify } from '@mycv/f8-notification';
const tfjs = require('@tensorflow/tfjs');
const mobilenet = require('@tensorflow-models/mobilenet');
const knnClassifier = require('@tensorflow-models/knn-classifier');

var sound = new Howl({
  src: [soundURL]
});

const NOT_TOUCH_LABEL = 'not_touch';
const TOUCHED_LABEL = 'touched';
const TRAINING_TIMES = 50;

function App() {

  const video = useRef();
  const classifier = useRef();
  const mobilenetModule = useRef();
  const canPlaySound = useRef(true);
  const [touched, setTouched] = useState(false);

  const init = async () => {
    console.log("init...");
    await setupCamera();

    console.log("setup camera success");

    classifier.current = knnClassifier.create();

    mobilenetModule.current = await mobilenet.load();

    console.log("setup done");
    console.log("Don't touch face and press Train 1");

    initNotifications({ cooldown: 3000 });
  }

  const setupCamera = () => {
    return new Promise((resolve, reject) => {
      navigator.getUserMedia = navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;

      if (navigator.getUserMedia) {
        navigator.getUserMedia(
          { video: true },
          stream => {
            video.current.srcObject = stream;
            video.current.addEventListener('loadeddata', resolve);
          },
          error => reject(error)
        );
      } else {
        reject();
      }
    })
  }

  const train = async label => {
    console.log(`[${label}] is training`);
    
    if (label == NOT_TOUCH_LABEL) {
      document.body.getElementsByClassName("message")[0].innerHTML = "Don't touch your face !<br>";
      document.getElementsByClassName("btn-not-touching")[0].style.backgroundColor = "green";
      document.getElementsByClassName("btn-not-touching")[0].style.borderColor = "green";
    } else {
      document.body.getElementsByClassName("message")[0].innerHTML = "Touch your face !<br>";
      document.getElementsByClassName("btn-touching")[0].style.backgroundColor = "green";
      document.getElementsByClassName("btn-touching")[0].style.borderColor = "green";
    }

    for (let i = 0; i < TRAINING_TIMES; i++) {
      console.log(`Progress ${parseInt((i + 1) / TRAINING_TIMES * 100)}%`);
      let info  = "";
      document.body.getElementsByClassName("info")[0].innerHTML = `${info}Training...${parseInt((i + 1) / TRAINING_TIMES * 100)}%`;
      await training(label);
    }

    document.getElementsByClassName("btn-not-touching")[0].style.backgroundColor = "#0b5ed7";
    document.getElementsByClassName("btn-not-touching")[0].style.borderColor = "#0b5ed7";
    document.getElementsByClassName("btn-touching")[0].style.backgroundColor = "#0b5ed7";
    document.getElementsByClassName("btn-touching")[0].style.borderColor = "#0b5ed7";
  }

  const training = label => {
    return new Promise(async resolve => {
      const embedding = mobilenetModule.current.infer(
        video.current,
        true
      );
      classifier.current.addExample(embedding, label);
      await sleep(100);
      resolve();
    });
  }

  const run = async () => {
    const embedding = mobilenetModule.current.infer(
      video.current,
      true
    );
    const result = await classifier.current.predictClass(embedding);

    if (result.label == TOUCHED_LABEL) {
      console.log("Touched");
      if (canPlaySound.current == true) {
        canPlaySound.current = false;
        sound.play();
      }
      notify('Put your hand off', { body: 'You just touched your face :)' });
      setTouched(true);
    } else {
      console.log("Not touch");
      setTouched(false);
    }

    await sleep(200);

    run();
  }

  const sleep = (ms = 0) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  useEffect(() => {
    init();

    sound.on('end', function () {
      canPlaySound.current = true;
    });

    // cleanup
    return () => {

    }
  }, []);
  return (
    <div className={`main ${touched ? 'touched' : ''}`}>
      <video
        ref={video}
        className='video'
        autoPlay
      />

      <div className={`control ${touched ? 'touched' : ''}`}>
        <button className='btn btn-primary btn-not-touching' id='' onClick={() => train(NOT_TOUCH_LABEL)}>Train not touching</button>
        <button className='btn btn-primary btn-touching' onClick={() => train(TOUCHED_LABEL)}>Train touching</button>
        <button className='btn btn-primary btn-running' onClick={() => {
          document.body.getElementsByClassName("message")[0].innerHTML = "";
          document.body.getElementsByClassName("info")[0].innerHTML = `Running...`;
          document.getElementsByClassName("btn-running")[0].style.backgroundColor = "green";
          run();
          }}>Run</button>

      </div>

      <div className='message'>
      </div>

      <div className={`info ${touched ? 'touched' : ''}`}>
      </div>
    </div>
  );
}

export default App;
