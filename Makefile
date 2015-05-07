test:
	FFRSS_CONFIG=./test/config.js ./node_modules/.bin/mocha --recursive --reporter spec test/

.PHONY: test

debug:
	FFRSS_CONFIG=./test/config.js node
