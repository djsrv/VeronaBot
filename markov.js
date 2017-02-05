'use strict'

const Promise = require('bluebird')
const redis = Promise.promisifyAll(require('redis'))
const chars = require('./chars')

class MarkovChain {
  constructor () {
    this.redis = null
  }

  async init (dialogue, db) {
    this.redis = redis.createClient()
    await this.redis.selectAsync(db)
    await this.redis.flushdbAsync()

    for (let text of dialogue) {
      let words = text.match(chars.words)
      for (let i = 0; i < words.length - 1; i++) {
        this.redis.hincrby(words[i], words[i + 1], 1)
      }
    }
  }

  async randomWord () {
    let word = await this.redis.randomkeyAsync()
    while (chars.punctuation.includes(word) || word === '--') {
      word = await this.redis.randomkeyAsync()
    }
    return word
  }

  async nextWord (word) {
    if (!(await this.knowsWord(word))) return null

    let data = await this.redis.hgetallAsync(word)
    let sum = Object.values(data).reduce((a, b) => a + parseInt(b), 0)

    let rand = Math.floor(Math.random() * sum + 1)
    let partialSum = 0
    for (let word in data) {
      partialSum += parseInt(data[word])
      if (partialSum >= rand) return word
    }

    return null
  }

  async knowsWord (word) {
    return await this.redis.existsAsync(word)
  }
}

module.exports = MarkovChain
