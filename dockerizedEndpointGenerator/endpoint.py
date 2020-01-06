from flask import Flask, jsonify, request, abort
import hashlib

application = Flask(__name__)

messageLookupTable = {}

@application.route('/messages', methods=['POST'])
def sendMessage():
    try:
    	messageValue = request.json['message']
    	encodedValue = hashlib.sha256(messageValue.encode()).hexdigest()
    	messageLookupTable[encodedValue] = messageValue
    	return jsonify(digest=encodedValue)
    except Exception as e:
    	raise abort(400, e.message)

@application.route("/messages/<sha>")
def getMessage(sha):
	if sha not in messageLookupTable.keys():
		raise abort(404, "Message not found")
	return jsonify(messageLookupTable[sha])


if __name__ == "__main__":
    application.run(host="0.0.0.0", port=80)
