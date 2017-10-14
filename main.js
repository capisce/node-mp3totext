#!/usr/bin/env node

const flac = require('node-flac');
const fs = require('fs');
const lame = require('lame');
const util = require('util');
const Speech = require('@google-cloud/speech');

if (process.argv.length < 4) {
  console.log("Usage: " + __filename + " FILENAME LANGUAGECODE");
  process.exit(-1);
}

const filename = process.argv[2];
const languageCode = process.argv[3];

var input = fs.createReadStream(filename);

var decoder = new lame.Decoder();
decoder.on('format', onFormat);
input.pipe(decoder);

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    let buffers = [];

    if (reject) {
      stream.on('error', reject);
    }

    stream.on('data', (data) => buffers.push(data));
    stream.on('end', () => resolve(Buffer.concat(buffers)));
  });
}

function onFormat (format) {
  streamToBuffer(decoder).then(buffer => {
    if (format.channels == 2) {
      const byteDepth = format.bitDepth / 8;
      const mono = Buffer.allocUnsafe(buffer.length / byteDepth);

      for (let i = 0; i < mono.length; i += byteDepth) {
        buffer.copy(mono, i, byteDepth*i, byteDepth*(i+1));
      }

      format.channels = 1;
      buffer = mono;
    }

    const flacEncoder = new flac.FlacEncoder(format);
    flacEncoder.write(buffer);
    flacEncoder.end();

    streamToBuffer(flacEncoder).then(buffer => {
      const config = {
        encoding: 'FLAC',
        sampleRateHertz: format.sampleRate,
        languageCode: languageCode
      };

      const audio = {
        content: buffer.toString('base64')
      };

      const request = {
        config: config,
        audio: audio
      };

      const speech = Speech();

      speech.recognize(request)
        .then((data) => {
          const response = data[0];
          const transcription = response.results.map(result =>
              result.alternatives[0].transcript).join('\n');
          console.log(transcription);
        })
        .catch((err) => {
          console.error('ERROR:', err);
        });
    });
  });
}
