var StateMachine = require('javascript-state-machine');

var util = require('./util');

var start = require('./data/act1/start.json'),
	park = require('./data/act1/park.json'),
	drug = require('./data/act1/drug.json'),
	off = require('./data/act1/off.json'),
	lib = require('./data/act1/lib.json')

const dicts = [start,park,drug,off,lib]
const states = util.createStates(dicts);

var fsmFactory = StateMachine.factory({
	init: 'start',
	transitions: [
		{ name: 'toStart', from: 'drug', to: 'start' },
		{ name: 'toPark', from: ['start','off','lib'], to: 'park' },
		{ name: 'toDrug', from: 'park', to: 'drug' },
		{ name: 'toOff', from: ['start','park'], to: 'off' },
		{ name: 'toLib', from: ['start','park','off'], to: 'lib'}
	],
	data: function(channel) {
		return {
			channel: channel,
			defaultLandings: {},
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
			let stateDict = states[this.state];
			if (stateDict !== undefined) {
				this.dialogue = stateDict.dialogue;
				if (this.state in this.defaultLandings) this.index = this.defaultLandings[this.state];
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
		onTransition: function(lifecycle, landingIndex) {
			this.dialogue = {};
			this.index = (landingIndex) ? landingIndex : 0;
		},
		choose: function(toIndex) {
			this.index = toIndex;
			this.sendPrompt();
			this.sendOptions();
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
			util.sendEmbed("Please choose an option below.\nFor example, to choose **Option A** please type: `!choose a`",this.channel,"",fields)
		},
		updateBudget: function(change) {
			this.budget = Math.round((this.budget + change + Number.EPSILON) * 100) / 100;
		},
		toString: function() {
			return JSON.stringify({
				"state": this.state,
				"budget": this.budget,
				"items": this.items,
				"transitions": this.transitions()
			})
		}
	}
});

module.exports.fsmFactory = fsmFactory;