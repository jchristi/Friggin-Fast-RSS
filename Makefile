test:
	FFRSS_CONFIG=./test/config.js ./node_modules/.bin/mocha --recursive --reporter spec test/

.PHONY: test

debug:
	FFRSS_CONFIG=./test/config.js node


vagranttest:
	vagrant up app
	vagrant up db
	vagrant up web
	make test
	vagrant down web
	vagrant down db
	vagrant down app
