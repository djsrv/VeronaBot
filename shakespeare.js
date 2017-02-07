'use strict'

const readline = require('readline')

const chars = require('./chars')
const getDialogue = require('./dialogue')
const MarkovChain = require('./markov')
const Bot = require('./bot')

const botNames = [
  'Sampson',
  'Gregory',
  'Benvolio',
  'Tybalt',
  'Capulet',
  'Lady Capulet',
  'Montague',
  'Lady Montague',
  'Prince',
  'Romeo',
  'Paris',
  'Nurse',
  'Juliet',
  'Mercutio',
  'Friar Laurence',
  'Balthasar',
  'Apothecary',
  'Friar John'
]

let bots = []
let nextBot = 0
let lastSentence = null

async function main () {
  console.log('Parsing play script...')
  let dialogue = await getDialogue()
  console.log(Object.keys(dialogue))

  console.log('Creating response chain...')
  let responses = await createResponsesChain(dialogue.all)

  for (let i = 0; i < botNames.length; i++) {
    let botName = botNames[i]
    console.log(`Initializing ${botName} bot...`)
    let bot = new Bot(botName, responses)
    await bot.init(dialogue[botName.toLowerCase()], i + 1)
    bots.push(bot)
  }

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

  nextBot = nextBot + 1
  if (nextBot === bots.length) nextBot = 0
  lastSentence = sentence
}

main()
