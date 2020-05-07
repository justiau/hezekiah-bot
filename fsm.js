var StateMachine = require('javascript-state-machine');

var util = require('./util');

var start = require('./data/act1/start.json'),
	park = require('./data/act1/park.json'),
	drug = require('./data/act1/drug.json'),
	office = require('./data/act1/office.json'),
	church = require('./data/act1/church.json'),
	churchQuiz = require('./data/act1/churchQuiz.json'),
	home = require('./data/act1/home.json'),
	shop = require('./data/act1/shop.json')

const dicts = [start,park,drug,office,church,home,shop,churchQuiz]
const states = util.createStates(dicts);

var fsmFactory = StateMachine.factory({
	init: 'start',
	transitions: [
		{ name: 'toStart', from: 'drug', to: 'start' },
		{ name: 'toPark', from: ['start','home'], to: 'park' },
		{ name: 'toDrug', from: 'park', to: 'drug' },
		{ name: 'toOffice', from: ['start','home','act1Finish'], to: 'office' },
		{ name: 'toHome', from: ['park','office','church','shop'], to: 'home' },
		{ name: 'toChurch', from: ['start','home','churchQuiz'], to: 'church' },
		{ name: 'toChurchQuiz', from: ['church'], to: 'churchQuiz' },
		{ name: 'toShop', from: ['start','home'], to: 'shop'},
	],
	data: function(channel) {
		return {
			channel: channel,
			defaultLandings: {},
			dialogue: [],
			options: [],
			shop: {},
			budget: 0,
			index: 0,
			items: {},
			status: {church:"doors"},
			mode: "",
			correct: 0
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
				if ("dialogue" in stateDict) {
					this.mode = "dialogue";
					this.dialogue = stateDict.dialogue;
				}
				else if ("quiz" in stateDict) {
					this.mode = "quiz";
					this.quiz = stateDict.quiz;
					this.postQuiz = stateDict.postQuiz;
				}
				this.updateOptions();
				this.sendPrompt();
				this.sendShop();
				this.sendOptions();
			}
		},
		onTransition: function(lifecycle, landingIndex) {
			this.dialogue = [];
			this.quiz = [];
			if (landingIndex) {
				this.index = landingIndex;
			} else if (lifecycle.to in this.defaultLandings) {
				this.index = this.defaultLandings[lifecycle.to]
			} else {
				this.index = 0;
			}
			this.shop = {};
			this.mode = "",
			this.correct = 0;
		},
		onAct2: function(lifecycle) {
			util.sendEmbed("CONGRATULATIONS! YOU'RE DONE for now.",this.channel)
		},
		choose: function(choice) {
			if (this.mode == "quiz") {
				if (choice == this.answer) {
					util.sendEmbed("**Correct!**",this.channel);
					this.correct++;
				} else {
					util.sendEmbed("",this.channel,"Incorrect!",[{name:"Correct Answer",value: this.answer}]);
				}
				if (this.index < this.quiz.length - 1) {
					this.updateIndex(this.index + 1);
				} else {
					util.sendEmbed("You answered " + this.correct + " out of " + this.quiz.length + " questions correctly.",this.channel);
					if ("result" in this.postQuiz) {
						let budgetChange = 0;
						if ("eachIncorrect" in this.postQuiz.result)
							budgetChange = budgetChange + (this.quiz.length - this.correct) * this.postQuiz.result.eachIncorrect;
						if ("eachCorrect" in this.postQuiz.result)
							budgetChange = budgetChange + (this.correct * this.postQuiz.result.eachCorrect)
						this.updateBudget(budgetChange);
					}
					this[this.postQuiz.transition](this.postQuiz.landing || 0);
				}
			} else {
				// if choice has a cost attached to it
				if ("cost" in choice) {
					if (choice["cost"] <= this.budget) {
						this.updateBudget(-choice["cost"]);
						sendEmbed("Remaining budget: $" + this.budget.toFixed(2), this.channel);
					} else {
						var fields = [{ name: "Option Cost", value: "$" + choice["cost"].toFixed(2) },{ name: "Current Budget", value: "$" + this.budget.toFixed(2) }];
						util.sendEmbed("You have insufficient funds to select that option.", this.channel, "Selection Failed", fields);
						this.sendOptions();
						return;
					}
				}
				// if choice has a result
				if ("result" in choice) {
					if ("budget" in choice.result) {
						this.updateBudget(choice.result.budget);
					}
					if ("takeItems" in choice.result) {
						choice.result.takeItems.forEach(takeItem => {
							this.rmItem(takeItem)
						});
					}
					if ("status" in choice.result) {
						this.updateStatus(choice.result.status);
					}
					if ("defaultLandings" in choice.result) {
						this.updateLandings(choice.result.defaultLandings);
					}
				}
				let postVal = ("narrSays" in choice) ? choice.narrSays : "\"" + choice.userSays + "\"";
				if (postVal) util.sendEmbed(postVal,this.channel)
				if ("transition" in choice) {
					if ("landing" in choice) {
						this[choice.transition](choice.landing);
					} else {
						this[choice.transition]();
					}
				} else if ("to" in choice) {
					this.updateIndex(choice.to);
				} else {
					this.sendOptions();
				}
			}
		},
		sendPrompt: function() {
			let prompt;
			if (this.mode == "dialogue") {
				let dialogueLayer = this.dialogue[this.index];
				prompt = dialogueLayer.prompt;
			} else if (this.mode == "quiz") {
				let questionLayer = this.quiz[this.index];
				prompt = questionLayer.question;
			}
			util.sendEmbed(prompt, this.channel);
		},
		sendOptions: function() {
			let fields = []
			if (this.mode == "quiz") {
				this.options.forEach((item,index) => {
					fields.push({"name":String.fromCharCode(97 + parseInt(index)),"value":item})
				});
			} else {
				for (var optionKey in this.options) {
					let option = this.options[optionKey];
					let descVal = ("userSays" in option) ? "\"" + option.userSays + "\"": option.desc;
					if ("cost" in option) descVal += "\n(Cost: $"+option.cost +")";
					fields.push({"name":String.fromCharCode(97 + parseInt(optionKey)),"value":descVal})
				}
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
		getShopItem: function(queryItemName) {
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
			let changeStr = (change >= 0) ? "+"+change : change
			util.sendEmbed("",this.channel,"Budget Change: " + changeStr,[{name:"Current Budget",value:this.budget}])
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
			let options;
			if (this.mode == "dialogue") {
				let dialogueLayer = this.dialogue[this.index];
				if (dialogueLayer === undefined || !("options" in dialogueLayer)) return;
				if ("items" in dialogueLayer) {
					this.shop = dialogueLayer.items;
				}
				options = [];
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
										let condTrue = (itemKey in this.items && (this.items[itemKey].quantity >= condItem.quantity))
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
			} else if (this.mode == "quiz") {
				let quizLayer = this.quiz[this.index];
				if (quizLayer === undefined || !("options" in quizLayer)) return;
				options = quizLayer.options;
				this.answer = quizLayer.answer;
			}
			this.options = options;
		},
		updateIndex(toIndex) {
			this.index = toIndex;
			this.updateOptions();
			this.sendPrompt();
			this.sendOptions();
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