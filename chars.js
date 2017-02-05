'use strict'

const words = /[\w'-]+|[.,!?;:]/g
const punctuation = ['.', ',', '!', '?', ';', ':']
const terminators = ['.', '!', '?']

module.exports = {words, punctuation, terminators}
