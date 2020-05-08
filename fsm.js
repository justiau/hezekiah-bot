var StateMachine = require('javascript-state-machine');

var fsmLib = require('./fsmLib')

var act1Factory = StateMachine.factory({
	init: 'finish',
	transitions: [
		{ name: 'toStart', from: 'drug', to: 'start' },
		{ name: 'toPark', from: ['start','home'], to: 'park' },
		{ name: 'toDrug', from: 'park', to: 'drug' },
		{ name: 'toOffice', from: ['start','home','act1Finish'], to: 'office' },
		{ name: 'toHome', from: ['park','office','church','shop'], to: 'home' },
		{ name: 'toChurch', from: ['start','home','churchQuiz'], to: 'church' },
		{ name: 'toChurchQuiz', from: ['church'], to: 'churchQuiz' },
		{ name: 'toShop', from: ['start','home'], to: 'shop'},
		{ name: 'toFinish', from: ['office'], to: 'finish' }
	],
	data: function(channel) {
		return {
			channel: channel,
			defaultLandings: {},
			interactions: [],
			budget: 2000,
			index: 0,
			items: {
				"addiction medication": {
					name:"Addiction Medication",
					quantity: 1
				}
			},
			// status: {church:"doors"},
			status: {church: "complete", idolsDestroyed: true},
			act: 0
		}
	},
	methods: fsmLib.methods
});

var act2Factory = StateMachine.factory({
	init: 'start',
	transitions: [
		{ name: 'toStart', from: ['war','forest'], to: 'start' },
		{ name: 'toHome', from: ['office','recruit','shop'], to: 'home' },
		{ name: 'toOffice', from: ['home','start'], to: 'office' },
		{ name: 'toRecruit', from: ['home','start'], to: 'recruit' },
		{ name: 'toShop', from: ['home','start','shopQuiz'], to: 'shop' },
		{ name: 'toShopQuiz', from: 'shop', to: 'shopQuiz' },
		{ name: 'toWar', from: 'office', to: 'war' },
		{ name: 'toForest', from: 'home', to: 'forest' },
		{ name: 'toFinish', from: 'forest', to: 'finish'}
	],
	data: function(channel, budget, items) {
		return {
			channel: channel,
			interactions: [],
			defaultLandings: {},
			default: {
				// items: (items === undefined) ? {} : items,
				items: {
					"crowbar": {
						name: "Crowbar",
						quantity: 1
					},
					"flashlight": {
						name: "Flashlight",
						quantity: 1
					}
				},
				budget: (budget === undefined) ? 2000 : budget,
				status: {demolition: "none", search: "none"},
			},
			index: 0,
			act: 1
		}
	},
	methods: fsmLib.methods
})

module.exports = {
	act1Factory: act1Factory,
	act2Factory: act2Factory
}