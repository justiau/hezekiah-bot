var StateMachine = require('javascript-state-machine');

var util = require('./util');

var start_1 = require('./data/1-start.json')
var a_1 = require('./data/1-a.json')

let dicts = [start_1,a_1];
// let states = createStates(dicts)

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
		{ name: 'toA', from: 'start', to: 'A' },
		{ name: 'toB', from: 'start', to: 'B' },
		{ name: 'toC', from: 'start', to: 'C' }
	],
	data: function(channel) {
		return {
			sendEmbedState: function(text,title,fields) { util.sendEmbed(text,channel,title,fields) },
			channel: channel,
			choices: {},
			states: createStates(dicts)
		}
	},
	methods: {
		onEnterState: function(lifecycle) {
			let stateDict = this.states[this.state];
			if (stateDict !== undefined) {
				this.choices = stateDict.choices;
				util.sendReturnEmbed(stateDict, this.channel)
			}
		},
		onLeaveState: function(lifecycle) {
			let stateDict = this.states[this.state];
			if (stateDict !== undefined) {
				this.sendEmbedState(stateDict.transitions[lifecycle.transition])
			}
		},
		onTransition: function() {
			this.choices = {}
		}
	}
});

module.exports.fsmFactory = fsmFactory;