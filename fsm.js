var StateMachine = require('javascript-state-machine');

var util = require('./util');

var start = require('./data/act1/start.json'),
	park = require('./data/act1/park.json'),
	drug = require('./data/act1/drug.json'),
	office = require('./data/act1/office.json'),
	church = require('./data/act1/church.json'),
	home = require('./data/act1/home.json'),
	shop = require('./data/act1/shop.json')

const dicts = [start,park,drug,office,church,home,shop]
const states = util.createStates(dicts);

var fsmFactory = StateMachine.factory({
	init: 'start',
	transitions: [
		{ name: 'toStart', from: 'drug', to: 'start' },
		{ name: 'toPark', from: ['start','home'], to: 'park' },
		{ name: 'toDrug', from: 'park', to: 'drug' },
		{ name: 'toOffice', from: ['start','home'], to: 'office' },
		{ name: 'toHome', from: ['park','office','church','shop'], to: 'home' },
		{ name: 'toChurch', from: ['start','home'], to: 'church'},
		{ name: 'toShop', from: ['start','home'], to: 'shop'},
	],
	data: function(channel) {
		return {
			channel: channel,
			defaultLandings: {},
			dialogue: {},
			options: [],
			shop: {},
			budget: 0,
			index: 0,
			items: {},
			status: {church:"doors"}
		}
	},
	methods: {
		onInit: function() {
			this.budget = 2000;
			// HAX0RS
			this.items = {
				"addiction medication": {
					name:"Addiction Medication",
					quantity:1
				},
				"hammer": {
					name:"Hammer",
					quantity:1
				}
			};
			this.defaultLandings = {}
		},
		onEnterState: function(lifecycle) {
			let stateDict = states[this.state];
			if (stateDict !== undefined) {
				this.dialogue = stateDict.dialogue;
				if (this.state in this.defaultLandings) this.index = this.defaultLandings[this.state];
				this.updateOptions();
				this.sendPrompt();
				this.sendShop();
				this.sendOptions();
			}
		},
		onTransition: function(lifecycle, landingIndex) {
			this.dialogue = {};
			this.index = (landingIndex) ? landingIndex : 0;
			this.shop = {};
		},
		choose: function(toIndex) {
			this.index = toIndex;
			this.updateOptions();
			this.sendPrompt();
			this.sendOptions();
		},
		sendPrompt: function() {
			let dialogueLayer = this.dialogue[this.index];
			util.sendEmbed(dialogueLayer.prompt, this.channel);
		},
		sendOptions: function() {
			let fields = []
			for (var optionKey in this.options) {
				let option = this.options[optionKey];
				let descVal = ("userSays" in option) ? "\"" + option.userSays + "\"": option.desc;
				if ("cost" in option) descVal += "\n(Cost: $"+option.cost +")";
				fields.push({"name":String.fromCharCode(97 + parseInt(optionKey)),"value":descVal})
			}
			if (this.options.length > 0)
				util.sendEmbed("Please choose an option below.\nFor example, to choose **Option A** please type: `!choose a`",this.channel,"",fields)
		},
		sendItems: function() {
			if (Object.keys(this.items).length == 0) {
                util.sendEmbed('Your inventory is empty.',this.channel);
                return;
            }
            var fields = [];
            for (var itemKey in this.items) {
                let item = this.items[itemKey];
                // fields.push({name:item.product,value:item.name});
                fields.push({name:item.name,value:item.quantity});
                if (fields.length >= 25) {
                    util.sendEmbed('',this.channel,'Items',fields);
                    fields = [];
                }
            }
            if (fields.length > 0) util.sendEmbed('',this.channel,'Items',fields);
		},
		sendShop: function() {
			let fields = []
			for (var itemName in this.shop) {
				let itemPrice = this.shop[itemName];
				fields.push({"name":"**" + itemName + "**","value":"$"+itemPrice})
			}
			if (Object.keys(this.shop).length > 0) {
				util.sendEmbed("",this.channel,"Shop Catalogue",fields);
			}
		},
		getItem: function(queryItemName) {
			if (queryItemName in this.shop) {
				return {name: queryItemName, price: this.shop[queryItemName]}
			}
			return null;
		},
		addItem: function(item) {
			if (item.name in this.items) {
				this.items[item.name.toLowerCase()].quantity++;
			} else {
				item.quantity = 1;
				this.items[item.name.toLowerCase()] = item;
			}
		},
		rmItem: function(itemName) {
			if (itemName in this.items) {
				let item = this.items[itemName.toLowerCase()];
				item.quantity--;
				if (item.quantity == 0) {
					delete this.items[itemName.toLowerCase()];
				}
			}
		},
		updateBudget: function(change) {
			this.budget = Math.round((this.budget + change + Number.EPSILON) * 100) / 100;
			if (this.budget < 0)
				this.budget = 0;
		},
		updateStatus: function(statusDict) {
			for (var statusKey in statusDict) {
				this.status[statusKey] = statusDict[statusKey]
			}
		},
		updateLandings: function(landings) {
			for (var landingState in landings) {
				this.defaultLandings[landingState] = landings[landingState]
			}
		},
		updateOptions: function() {
			let dialogueLayer = this.dialogue[this.index];
			if (dialogueLayer === undefined || !("options" in dialogueLayer)) return;
			if ("items" in dialogueLayer) {
				this.shop = dialogueLayer.items;
			}
			let options = [];
			optionLoop:
			for (var optionKey in dialogueLayer.options) {
				let option = dialogueLayer.options[optionKey];
				if ("cond" in option) {
					for (var condType in option.cond) {
						condSwitch:
						switch (condType) {
							case 'items':
								// Check all item conditions are met
								for (var itemKey in option.cond.items) {
									let condItem = option.cond.items[itemKey]
									itemKey = itemKey.toLowerCase();
									let condTrue = (itemKey in this.items && (this.items[itemKey].quantity == condItem.quantity))
									if (!condTrue) continue optionLoop;
								}
								break condSwitch;
							case 'status':
								for (var statusKey in option.cond.status) {
									let statusBl = option.cond.status[statusKey]
									let condTrue = 	((statusKey in this.status && (this.status[statusKey] == statusBl))
													|| (!(statusKey in this.status) && !statusBl));
									if (!condTrue) continue optionLoop;
								}
						}
					}
				}
				options.push(option);
			}
			this.options = options;
		},
		toString: function() {
			return JSON.stringify({
				"state": this.state,
				"index": this.index,
				"status": this.status,
				"budget": this.budget,
				"items": this.items,
				"transitions": this.transitions()
			})
		}
	}
});

module.exports.fsmFactory = fsmFactory;