var StateMachine = require('javascript-state-machine');

var fsmLib = require('./fsmLib');
var util = require('./util');

var act1Factory = StateMachine.factory({
	init: 'start',
	transitions: [
		{ name: 'toStart', from: ['start','drug'], to: 'start' },
		{ name: 'toPark', from: ['start','home'], to: 'park' },
		{ name: 'toDrug', from: 'park', to: 'drug' },
		{ name: 'toOffice', from: ['start','home','act1Finish'], to: 'office' },
		{ name: 'toHome', from: ['park','office','church','shop'], to: 'home' },
		{ name: 'toChurch', from: ['start','home','churchQuiz'], to: 'church' },
		{ name: 'toChurchQuiz', from: ['church'], to: 'churchQuiz' },
		{ name: 'toShop', from: ['start','home'], to: 'shop'  },
		{ name: 'toFinish', from: ['office'], to: 'finish' }
	],
	data: function(channel) {
		return {
			channel: channel,
			defaultLandings: {},
			interactions: [],
			index: 0,
			default: {
				items: {},
				budget: 2000,
				status: {church: "doors"},
			},
			act: 0
		}
	},
	methods: fsmLib.methods
});

var act2Factory = StateMachine.factory({
	init: 'start',
	transitions: [
		{ name: 'toStart', from: ['war','forest','church'], to: 'start' },
		{ name: 'toHome', from: ['office','recruit','shop','postRace','church'], to: 'home' },
		{ name: 'toOffice', from: ['home','start'], to: 'office' },
		{ name: 'toRecruit', from: ['home','start'], to: 'recruit' },
		{ name: 'toShop', from: ['home','start','shopQuiz'], to: 'shop' },
		{ name: 'toShopQuiz', from: 'shop', to: 'shopQuiz' },
		{ name: 'toWar', from: 'office', to: 'war' },
		{ name: 'toForest', from: 'home', to: 'forest' },
		{ name: 'toFinish', from: 'forest', to: 'finish' },
		{ name: 'toRace', from: 'church', to: 'race' },
		{ name: 'toChurch', from: ['start','home'], to: 'church' },
		{ name: 'toPostRace', from: 'race', to: 'postRace' }
	],
	data: function(channel, budget, items) {
		return {
			channel: channel,
			interactions: [],
			defaultLandings: {},
			default: {
				items: (items === undefined) ? {} : items,
				budget: (budget === undefined) ? 2000 : budget,
				status: {demolition: "none", search: "none", church: true},
			},
			index: 0,
			act: 1
		}
	},
	methods: fsmLib.methods
})

var act3Factory = StateMachine.factory({
	init: 'start',
	transitions: [
		{ name: 'toHome', from: ['forest','internet','shop'], to: 'home' },
		{ name: 'toForest', from: ['start','home','forestQuiz'], to: 'forest' },
		{ name: 'toInternet', from: ['start','home'], to: 'internet' },
		{ name: 'toShop', from: ['start', 'home'], to: 'shop' },
		{ name: 'toForestQuiz', from: 'forest', to: 'forestQuiz' },
		{ name: 'toFinish', from: 'home', to: 'finish' }
	],
	data: function(channel, budget, items) {
		return {
			channel: channel,
			interactions: [],
			defaultLandings: {},
			default: {
				items: (items === undefined) ? {} : items,
				budget: (budget === undefined) ? 2000 : budget,
				status: {ranger: true},
			},
			index: 0,
			act: 2
		}
	},
	methods: {
		onFinish: function(lifecycle) {
			let products = [];
			let titles = [];
			for (var itemKey in this.items) {
				let item = this.items[itemKey];
				if (("product" in item) && (item.product !== undefined) && !(products.includes(item.product))) {
					products.push(item.product);
					titles.push(item.name);
				}
			}
			if (products.length >= 1);
				util.sendEmbed("You show the diplomats your vast collections of " + products[Math.floor(Math.random()*products.length)],this.channel);
			if (products.length >= 2);
				util.sendEmbed("They particularly like your unique selection of " + products[Math.floor(Math.random()*products.length)],this.channel);
			if (titles.length >= 1);
				util.sendEmbed("However, their favourite item of yours was the " + titles[Math.floor(Math.random()*titles.length)],this.channel);
			util.sendEmbed("Your final budget was: $" + this.budget + ".",this.channel);
			if (this.budget < 0.1) {
				util.sendEmbed("This greatly impressed the Federation! This Prime Minister is so efficient with expenditure!",this.channel)
			} else if (this.budget < 1) {
				util.sendEmbed("This impressed the Federation. This Prime Minister is reasonably efficient with expenditure.",this.channel)
			} else if (this.budget < 10) {
				util.sendEmbed("This did not impress the Federation. This Prime Minister is so wasteful with expenditure! Hector could have spent a bit more to entertain them...",this.channel)
			} else {
				util.sendEmbed("This greatly disappointed the Federation. This Prime Minister is incredibly wasteful with vast amounts of money sitting unused.",this.channel)
			}
			util.sendEmbed("Congratulation! You have finished Act 3 of Hezekiah!",this.channel);
		},
		...fsmLib.methods
	}
})

module.exports = {
	act1Factory: act1Factory,
	act2Factory: act2Factory,
	act3Factory: act3Factory
}