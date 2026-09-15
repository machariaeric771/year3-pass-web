'use strict';

function extractText(response) {
  return response?.choices?.[0]?.message?.content || '';
}
function normalize(response) {
  return {
    text: extractText(response),
    model: response?.model || null,
    usage: response?.usage || null,
    raw: response
  };
}
module.exports = { extractText, normalize };
