const responses = {
    "hi": 'Hello, how are you doing?',
    'doing great': 'How can I help you?',
}

function getResponse(text) {
    return responses[text.toLowerCase()] ?? 'Could not understand your question!'
}