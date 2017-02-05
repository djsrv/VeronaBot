'use strict'

const readline = require('readline')

const chars = require('./chars')
const getDialogue = require('./dialogue')
const MarkovChain = require('./markov')
const Bot = require('./bot')

let bots = {}
let nextBot = 'romeo'
let lastSentence = null

async function main () {
  console.log('Parsing play script...')
  let dialogue = await getDialogue()

  console.log('Creating response chain...')
  let responses = await createResponsesChain(dialogue.all)

  console.log('Initializing Romeo bot...')
  let romeo = new Bot('Romeo', responses)
  await romeo.init(dialogue.ROMEO, 1)
  bots.romeo = romeo

  console.log('Initializing Juliet bot...')
  let juliet = new Bot('Juliet', responses)
  await juliet.init(dialogue.JULIET, 2)
  bots.juliet = juliet

  readline.emitKeypressEvents(process.stdin)
  process.stdin.setRawMode(true)
  process.stdin.on('keypress', speak)

  console.log('Done! Press any key to continue.')
}

async function createResponsesChain (dialogue) {
  let text = dialogue.join('\n')
  let sentences = text.split(/[.!?]/g).map(s => s.trim())
  sentences.pop()

  let responses = []
  let lastWord = null
  for (let sentence of sentences) {
    let words = sentence.match(chars.words)
    if (lastWord) responses.push(lastWord + ' ' + words[0])
    lastWord = words[words.length - 1]
  }

  let markov = new MarkovChain()
  markov.init(responses, 0)

  return markov
}

async function speak (str, key) {
  if (key.sequence === '\u0003') process.exit()

  let bot = bots[nextBot]
  let sentence = lastSentence ? await bot.respondToSentence(lastSentence) : await bot.randomSentence()
  console.log(`${bot.name}: ${sentence}`)

  nextBot = nextBot === 'romeo' ? 'juliet' : 'romeo'
  lastSentence = sentence
}

main()
