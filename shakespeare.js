'use strict'

const dotenv = require('dotenv')
const Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs'))
const readline = require('readline')
const Twitter = require('twitter')

dotenv.load()
const online = process.env.ONLINE === 'true'

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

let client = null
if (online) {
  client = new Twitter({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
  })
}

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

  let savedState = null
  try {
    savedState = JSON.parse(await fs.readFileAsync('save.json', 'utf-8'))
  } catch (err) {}
  if (savedState) {
    for (let name of savedState.onStage) {
      onStage.push(bots[name])
    }
    linesSinceLastStageDirection = savedState.linesSinceLastStageDirection
    lastSentence = savedState.lastSentence
    nextLine()
  } else {
    enterBots([bots.Romeo, bots.Juliet])
  }

  if (online) {
    setInterval(nextLine, 1000 * 60 * 5)
  } else {
    readline.emitKeypressEvents(process.stdin)
    process.stdin.setRawMode(true)
    process.stdin.on('keypress', handleKeyPress)
  }
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

function handleKeyPress (str, key) {
  if (key.sequence === '\u0003') process.exit()
  else nextLine()
}

/* Line Generation */

async function nextLine () {
  if (linesSinceLastStageDirection > 3) {
    let chance = onStage.length > 1 ? 20 : 5
    let rand = Math.floor(Math.random() * chance)
    if (rand === 0) {
      let success = enterRandomBots()
      if (!success) exitRandomBots()
    } else if (rand === 1) {
      let success = exitRandomBots()
      if (!success) enterRandomBots()
    } else {
      await doDialogue()
    }
  } else {
    if (onStage.length > 0) await doDialogue()
    else enterRandomBots()
  }
}

async function doDialogue () {
  let index = Math.floor(Math.random() * onStage.length)
  let bot = onStage[index]
  let sentence = lastSentence ? await bot.respondToSentence(lastSentence) : await bot.randomSentence()
  say(`${bot.name.toUpperCase()}: ${sentence}`)

  lastSentence = sentence
  linesSinceLastStageDirection += 1
  return true
}

function enterRandomBots () {
  let count = Math.floor(Math.random() * 3) + 1
  let offStage = getOffstageBots()
  let entering = []

  let i = 0
  while (i < count && offStage.length > 0 && onStage.length + entering.length <= 6) {
    let index = Math.floor(Math.random() * offStage.length)
    let bot = offStage[index]
    offStage.splice(index, 1)
    entering.push(bot)
    i += 1
  }

  return enterBots(entering)
}

function enterBots (entering) {
  let names = entering.map(bot => bot.name.toUpperCase())

  for (let bot of entering) {
    onStage.push(bot)
  }

  if (entering.length === 0) {
    return false
  } else if (entering.length === 1) {
    say(`Enter ${names[0]}`)
  } else if (entering.length === 2) {
    say(`Enter ${names[0]} and ${names[1]}`)
  } else if (entering.length === 3) {
    say(`Enter ${names[0]}, ${names[1]}, and ${names[2]}`)
  }

  linesSinceLastStageDirection = 0
  return true
}

function exitRandomBots () {
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
    say(`Exit ${exiting[0]}`)
  } else if (exiting.length === 2) {
    say(`Exeunt ${exiting[0]} and ${exiting[1]}`)
  } else if (exiting.length === 3) {
    say(`Exeunt ${exiting[0]}, ${exiting[1]}, and ${exiting[2]}`)
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

/* Saying and Saving */

async function say (msg) {
  console.log(msg)
  if (online) {
    try {
      await client.post('statuses/update', {status: msg})
    } catch (err) {
      throw err
    }
  }
  saveState()
}

async function saveState () {
  let onStageNames = onStage.map(bot => bot.name)
  let state = {
    onStage: onStageNames,
    linesSinceLastStageDirection,
    lastSentence
  }
  try {
    fs.writeFileAsync('save.json', JSON.stringify(state))
  } catch (err) {
    throw err
  }
}

main()
