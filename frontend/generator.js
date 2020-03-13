
var app = new Vue({
	el: ".app",
	data: {
		corpuses: [],
		corpus: null,
		length: 1000,
		order: 8,
		temperatureScale: [0.1, 0.25, 0.5, 0.9, 1, 1.3, 2, 3, 5, 9],
		temperature: 4, // 1..10 -> 0.1..8
        start: "",
        uniform: false,
        error: null,
        story: "",
        maxOrder: 10,
        url: "",
        rolling: 0
	},
	computed: {
		actualTemperature: function() {
			return this.temperatureScale[this.temperature];
		}
    },
    watch: {
        corpus: function() {
            var newCorpus = this.corpuses.find(x => x.name == this.corpus);
            if(newCorpus) {
                this.maxOrder = newCorpus.order;
            } else {
                this.maxOrder = 10;
            }
            if(this.order > this.maxOrder) {
                this.order = this.maxOrder;
            }
        },
        length: function() {
            if(this.length > 10000) this.length = 10000;
            if(this.length < 1) this.length = 1;
        }
    },
    methods: {
        generate: function(start) {
            var query = {
                action: 'generate',
                file: this.corpus,
                history: start || "",
                length: this.length,
                order: this.order,
                func: this.uniform ? 'uniform' : 'weighted',
                temperature: this.temperatureScale[this.temperatureScale.length - 1 - this.temperature]
            };

            var queryString = [];
            for(var key in query) {
                queryString.push(key + "=" + encodeURIComponent(query[key]));
            }
            queryString = queryString.join("&");

            return fetch(this.url + queryString).then(response => {
                return response.json();
            }).then(json => {
                if(json.status == 'ok') {
                    return json.text;
                } else {
                    this.error = true;
                }
            }).catch(err => {
                this.error = true;
            });
        },
        fresh: function() {
            return this.generate(this.start).then(text => {
                this.story = text;
            });
        },
        more: function() {
            var start = this.story.slice(-this.order);
            return this.generate(start).then(text => {
                this.story += text.slice(this.order);
            });
        },
        roll: function() {
            if(this.rolling) {
                const timeout = 1000;
                let i = this.corpuses.findIndex(x => x.name == this.corpus);
                i = (i + 1) % this.corpuses.length;
                this.corpus = this.corpuses[i].name;
                this.more().then(() => {
                    this.$refs.stop.scrollIntoView();
                    setTimeout(() => {
                        this.roll();
                    }, timeout);
                });
            }
        },
        startRoll: function() {
            this.rolling = true;
            this.roll();
        },
        stopRoll: function() {
            this.rolling = false;
        }
    },
	mounted: function() {
        var url = location.origin;
        if(url == "file://") {
            url = "http://localhost";
        }
        url += "/?";
        this.url = url;
        fetch(this.url + "action=stats").then(response => {
            return response.json();
        }).then(json => {
            if(json.status == "ok") {
                json.stats.forEach(x => {
                    this.corpuses.push(x);
                    if(x.default) {
                        this.corpus = x.name;
                    }
                });
                if(this.corpuses.find(x => x.name == 'sasha')) {
                    this.corpus = 'sasha';
                }
            } else {
                this.error = true;
            }
        }).catch(err => {
            this.error = true;
        });
	}
});