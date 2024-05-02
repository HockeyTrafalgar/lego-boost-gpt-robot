import LegoBoost from './legoBoost';
import { BoostConnector } from './boostConnector';

import * as $ from 'jquery';




const boost = new LegoBoost();

// @ts-ignore
window.boost = boost;

// @ts-ignore
boost.logDebug = console.log;

console.log('Running in browser');

var apiKey="";
var openai=null;

$(document).ready(function() { 
	
	$("#openAIKey").val(localStorage.getItem('openAIKey'));

	$("#openAIKey").on("change", function() {
		localStorage.setItem('openAIKey', $("#openAIKey").val().toString());
		 apiKey = $("#openAIKey").val().toString();
	});

	apiKey = $("#openAIKey").val().toString();


  
});



const generateOpenAIAudio = async (text, req, res) => {
    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova",
      input: text,
      format: "opus",
    });
  
    console.log("generating streaming audio for: ", text);
  
    res.writeHead(200, {
      "Content-Type": "audio/ogg",
      "Transfer-Encoding": "chunked",
    });
  
    const readableStream = response.body;
  
    // Pipe the readable stream to the response
    readableStream.pipe(res);
  
  
    readableStream.on("end", () => {
      console.log(`Stream ended.`);
      res.end();
    });
  
    readableStream.on("error", (e) => {
      res.end();
      console.error("Error streaming TTS:", e);
    });
  };