test:
	FFRSS_CONFIG=./test/config.js ./node_modules/mocha/bin/mocha --recursive --reporter spec test/

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

dockerbuild:
	docker build -t jchristi/friggin-fast-rss docker/

dockerrun:
	docker run -p 49160:8080 -d jchristi/friggin-fast-rss
