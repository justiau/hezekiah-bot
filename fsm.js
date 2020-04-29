var StateMachine = require('javascript-state-machine');

var util = require('./util');

var start = require('./data/act1/start.json'),
	park = require('./data/act1/park.json'),
	parkEmpty = require('./data/act1/parkEmpty.json'),
	drug = require('./data/act1/drug.json')

let dicts = [start,park,parkEmpty,drug]

function createStates(dicts) {
	let states = {}
	for (var dictKey in dicts) {
		let dict = dicts[dictKey];
		states[dict.name] = dict;
	}
	return states;
}

var fsmFactory = StateMachine.factory({
	init: 'start',
	transitions: [
		{ name: 'toStart', from: 'drug', to: 'start' },
		{ name: 'toPark', from: 'start', to: 'park' },
		{ name: 'toParkEmpty', from: ['start','park'], to: 'parkEmpty' },
		{ name: 'toDrug', from: 'park', to: 'drug' },
	],
	data: function(channel) {
		return {
			toString: function() {
				return JSON.stringify({
					"state": this.state,
					"budget": this.budget,
					"items": this.items,
					"transitions": this.transitions()
				})
			},
			sendPrompt: function() {
				let dialogueLayer = this.dialogue[this.index];
				util.sendEmbed(dialogueLayer.prompt, this.channel);
			},
			sendOptions: function() {
				let dialogueLayer = this.dialogue[this.index];
				let fields = []
				for (var optionKey in dialogueLayer.options) {
					let option = dialogueLayer.options[optionKey];
					let descVal = ("userSays" in option) ? option.userSays : option.desc;
					if ("cost" in option) descVal += "\n**(Cost: $"+option.cost +")**"
					fields.push({"name":optionKey,"value":descVal})
				}
				util.sendEmbed("Please choose an option below.\nFor example, to choose **Option A** please type: `!choose a`",channel,"",fields)
			},
			updateBudget: function(change) {
				this.budget = Math.round((this.budget + change + Number.EPSILON) * 100) / 100;
			},
			channel: channel,
			states: createStates(dicts),
			dialogue: {},
			budget: 0,
			index: 0,
			items: []
		}
	},
	methods: {
		onEnterStart: function() {
			budget = 0;
			items = [];
		},
		onEnterState: function(lifecycle) {
			let stateDict = this.states[this.state];
			if (stateDict !== undefined) {
				this.dialogue = stateDict.dialogue;
				this.sendPrompt();
				this.sendOptions();
			}
		},
		// onLeaveState: async function(lifecycle) {
		// 	let stateDict = this.states[this.state];
		// 	if (stateDict !== undefined) {
		// 		util.sendEmbed(stateDict.choices[]transitions[lifecycle.transition],this.channel);
		// 		await util.sleep(util.sleepDur);
		// 	}
		// },
		onTransition: function() {
			this.dialogue = {};
			this.index = 0;
		},
		choose: function() {
			this.index++;
			this.sendPrompt();
		}
	}
});

module.exports.fsmFactory = fsmFactory;