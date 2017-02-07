'use strict'

const MarkovChain = require('./markov')
const chars = require('./chars')

const capitalizedPrefixes = require('./capitalized_prefixes.json')
const capitalizedWords = ['angelica', "i'll", 'saint']
const capitalizedLetters = ['i', 'o', 'r']

class Bot {
  constructor (name, responses) {
    this.name = name
    this.responses = responses
    this.markov = new MarkovChain()
  }

  async init (dialogue, db) {
    await this.markov.init(dialogue, db)
  }

  async sentence (firstWord) {
    let sentence = this.capitalize(firstWord)
    let lastWord = firstWord
    let word = null
    while (true) {
      word = await this.markov.nextWord(lastWord)
      if (!chars.punctuation.includes(word)) sentence += ' '
      if (this.shouldCapitalize(word)) {
        sentence += this.capitalize(word)
      } else {
        sentence += word
      }
      if (chars.terminators.includes(word)) break
      lastWord = word
    }
    if (sentence.length <= 10) { // Respond to self if sentence is too short
      sentence += ' ' + await this.respondToWord(lastWord)
    }
    if (sentence.length <= 140) { // Try again if sentence is too long
      return sentence
    } else {
      return await this.sentence(firstWord)
    }
  }

  async randomSentence () {
    let firstWord = await this.markov.randomWord()
    return await this.sentence(firstWord)
  }

  async respondToSentence (sentence) {
    let words = sentence.match(chars.words)
    let lastWord = words[words.length - 2] // Ignore ending punctuation
    return await this.respondToWord(lastWord)
  }

  async respondToWord (word) {
    let firstWord = await this.responses.nextWord(word)
    if (!firstWord || !(await this.markov.knowsWord(firstWord)) || firstWord === '--') {
      return await this.randomSentence()
    }
    return await this.sentence(firstWord)
  }

  shouldCapitalize (word) {
    for (let prefix of capitalizedPrefixes) {
      if (word.startsWith(prefix)) return true
    }
    if (capitalizedWords.includes(word)) return true
    if (capitalizedLetters.includes(word)) return true
    return false
  }

  capitalize (word) {
    if (word[0] === "'") {
      return "'" + word[1].toUpperCase() + word.slice(2)
    }
    return word[0].toUpperCase() + word.slice(1)
  }
}

module.exports = Bot
