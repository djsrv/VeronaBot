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

let bots = {}
let onStage = []

let linesSinceLastStageDirection = 0
let lastSentence = null

async function main () {
  console.log('Parsing play script...')
  let dialogue = await getDialogue()

  console.log('Creating response chain...')
  let responses = await createResponsesChain(dialogue.all)

  for (let i = 0; i < botNames.length; i++) {
    let botName = botNames[i]
    console.log(`Initializing ${botName} bot...`)
    let bot = new Bot(botName, responses)
    await bot.init(dialogue[botName.toLowerCase()], i + 1)
    bots[botName] = bot
  }

  readline.emitKeypressEvents(process.stdin)
  process.stdin.setRawMode(true)
  process.stdin.on('keypress', nextLine)

  console.log('Done! Press any key to continue.')

  enterBots()
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

async function nextLine (str, key) {
  if (key.sequence === '\u0003') process.exit()

  if (linesSinceLastStageDirection > 3) {
    let chance = onStage.length > 1 ? 20 : 5
    let rand = Math.floor(Math.random() * chance)
    if (rand === 0) {
      let success = enterBots()
      if (!success) exitBots()
    } else if (rand === 1) {
      let success = exitBots()
      if (!success) enterBots()
    } else {
      doDialogue()
    }
  } else {
    if (onStage.length > 0) await doDialogue()
    else enterBots()
  }
}

async function doDialogue () {
  let index = Math.floor(Math.random() * onStage.length)
  let bot = onStage[index]
  let sentence = lastSentence ? await bot.respondToSentence(lastSentence) : await bot.randomSentence()
  console.log(`${bot.name}: ${sentence}`)

  lastSentence = sentence
  linesSinceLastStageDirection += 1
  return true
}

function enterBots () {
  let count = Math.floor(Math.random() * 3) + 1
  let offStage = getOffstageBots()
  let entering = []

  let i = 0
  while (i < count && offStage.length > 0 && onStage.length <= 6) {
    let index = Math.floor(Math.random() * offStage.length)
    let bot = offStage[index]
    offStage.splice(index, 1)
    onStage.push(bot)
    entering.push(bot.name.toUpperCase())
    i += 1
  }

  if (entering.length === 0) {
    return false
  } else if (entering.length === 1) {
    console.log(`Enter ${entering[0]}`)
  } else if (entering.length === 2) {
    console.log(`Enter ${entering[0]} and ${entering[1]}`)
  } else if (entering.length === 3) {
    console.log(`Enter ${entering[0]}, ${entering[1]}, and ${entering[2]}`)
  }

  linesSinceLastStageDirection = 0
  return true
}

function exitBots () {
  let count = Math.floor(Math.random() * 3) + 1
  let exiting = []

  let i = 0
  while (i < count && onStage.length > 0) {
    let index = Math.floor(Math.random() * onStage.length)
    let bot = onStage[index]
    onStage.splice(index, 1)
    exiting.push(bot.name.toUpperCase())
    i += 1
  }

  if (exiting.length === 0) {
    return false
  } else if (exiting.length === 1) {
    console.log(`Exit ${exiting[0]}`)
  } else if (exiting.length === 2) {
    console.log(`Exeunt ${exiting[0]} and ${exiting[1]}`)
  } else if (exiting.length === 3) {
    console.log(`Exeunt ${exiting[0]}, ${exiting[1]}, and ${exiting[2]}`)
  }

  linesSinceLastStageDirection = 0
  return true
}

function getOffstageBots () {
  let result = []
  for (let botName in bots) {
    if (bots.hasOwnProperty(botName)) {
      let bot = bots[botName]
      if (!onStage.includes(bot)) {
        result.push(bot)
      }
    }
  }
  return result
}

main()
