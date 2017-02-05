'use strict'

const Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs'))
const jsdom = Promise.promisifyAll(require('jsdom'))

async function getDialogue (callback) {
  let html = await fs.readFileAsync('romeo_and_juliet.html', 'utf-8')
  let window = await jsdom.envAsync(html)
  return parseScript(window.document)
}

function parseScript (document) {
  let dialogue = {}
  dialogue.all = []

  var speeches = document.querySelectorAll('a[name^=speech]')
  for (let speech of speeches) {
    let {speaker, text} = parseSpeech(speech)
    if (!dialogue[speaker]) dialogue[speaker] = []
    dialogue[speaker].push(text)
    dialogue.all.push(text)
  }

  return dialogue
}

function parseSpeech (speech) {
  let speaker = speech.children[0].textContent

  let quote = speech.nextSibling.nextSibling
  let lines = quote.querySelectorAll('a')
  let parsedLines = []
  for (let line of lines) {
    parsedLines.push(formatText(line.textContent))
  }
  let text = parsedLines.join('\n')

  return {speaker, text}
}

function formatText (text) {
  text = text.replace(/\[.*?\]/g, '') // Remove stage directions
  text = text.toLowerCase()
  text = text.trim()
  return text
}

module.exports = getDialogue
