var fsmStates = require('./fsmStates');
var util = require('./util');

module.exports.methods = {
	onEnterState: function(lifecycle) {
		let stateDict = fsmStates.states[this.act][this.state];
		if (stateDict === undefined) return;
		this.mode = stateDict.type;
		switch (this.mode) {
			case "dialogue":
				this.interactions = stateDict.dialogue;
				break;
			case "quiz":
				this.interactions = stateDict.quiz;
				this.quizState = stateDict.postQuiz;
				this.quizState.correct = 0;
				break;
			case "info":
				this.interactions = stateDict.text;
				break;
			case "spam":
				this.interactions = stateDict.text;
				this.spamState = stateDict.spamState;
				this.spamState.count = 0;
				break;
		}
		this.updateOptions();
		this.sendPrompt();
		this.sendShop();
		this.sendOptions();
		this.sendSpam(stateDict.name);
	},
	onStart: function(lifecyle) {
		this.budget = this.default.budget;
		this.items = JSON.parse(JSON.stringify(this.default.items));
		this.status = JSON.parse(JSON.stringify(this.default.status));
		this.defaultLandings = {};
	},
	onTransition: function(lifecycle, landingIndex) {
		this.interactions = [];
		if (landingIndex) {
			this.index = landingIndex;
		} else if (lifecycle.to in this.defaultLandings) {
			this.index = this.defaultLandings[lifecycle.to]
		} else {
			this.index = 0;
		}
		this.shop = {};
	},
	choose: function(choice) {
		if (this.mode == "quiz") {
			if (choice == this.quizState.answer) {
				util.sendEmbed("",this.channel,"Correct");
				this.quizState.correct++;
			} else {
                util.sendEmbed("",this.channel,"Incorrect",[{name:"Correct Answer",value: this.quizState.answer}]);
			}
			this.next();
		} else if (this.mode == "dialogue") {
			// if choice has a cost attached to it
			if ("cost" in choice) {
				if (choice["cost"] <= this.budget) {
					this.updateBudget(-choice["cost"]);
				} else {
					var fields = [{ name: "Option Cost", value: "$" + choice["cost"].toFixed(2) },{ name: "Current Budget", value: "$" + this.budget.toFixed(2) }];
					util.sendEmbed("You have insufficient funds to select that option.", this.channel, "Selection Failed", fields);
					this.sendOptions();
					return;
				}
			}
			let postVal = ("narrSays" in choice) ? choice.narrSays : "\"" + choice.userSays + "\"";
			if (postVal) util.sendEmbed(postVal,this.channel)
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
				if ("giveItems" in choice.result) {
					choice.result.giveItems.forEach(giveItem => {
						this.addItem(giveItem)
					})
				}
				if ("status" in choice.result) {
					this.updateStatus(choice.result.status);
				}
				if ("defaultLandings" in choice.result) {
					this.updateLandings(choice.result.defaultLandings);
				}
			}
			if ("transition" in choice) {
				if ("landing" in choice) {
					this[choice.transition](choice.landing);
				} else {
					this[choice.transition]();
				}
			} else if ("to" in choice) {
				this.updateIndex(choice.to);
			} else {
				this.updateOptions();
				this.sendOptions();
			}
		}
	},
	sendPrompt: function() {
		let section = this.interactions[this.index];
		let prompt;
		let title = "";
        switch (this.mode) {
            case "dialogue":
                prompt = section.prompt;
                break;
            case "quiz":
				title = "Question:"
                prompt = section.question;
                break;
            case "info":
                prompt = section;
				break;
			case "spam":
				prompt = section;
				break;
        }
		util.sendEmbed(prompt, this.channel,title);
	},
	sendOptions: function() {
		let fields = []
		if (this.mode == "quiz") {
			this.options.forEach((option,index) => {
				fields.push({"name":String.fromCharCode(97 + parseInt(index)),"value":option})
			});
			let startState = this.state;
			let startIndex = this.index;
			let answer = this.quizState.answer;
			setTimeout(() => {
				if ((startIndex == this.index) && (startState == this.state)) {
					util.sendEmbed("",this.channel,"Question Timeout",[{name: "Correct Answer", value: answer}]);
					this.next();
				}
			}, 25000);
		} else if (this.mode == "dialogue") {
			this.options.forEach((option,index) => {
				let descVal = ("userSays" in option) ? "\"" + option.userSays + "\"": option.desc;
				if ("cost" in option) descVal += "\n**(Cost: $"+option.cost +")**";
				fields.push({"name":"**"+String.fromCharCode(97 + parseInt(index))+"**","value":descVal})
			})
		}
		else if (this.mode == "info") return;
		else if (this.mode == "spam") return;
		if (this.options !== undefined && this.options.length > 0) {
			util.sendEmbed("Please choose an option below.\nFor example, to choose **Option A** please type: `!choose a`",this.channel,"",fields)
		}
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
	sendBudget: function() {
		util.sendEmbed("", this.channel, "Budget", [{name: 'Current Budget', value:"$" + this.budget}]);
	},
	sendSpam: function(spamName) {
		if (this.mode == "spam") util.sendEmbed(spamName + " is about to begin. \nYou will be given " + (this.spamState.timer / 1000) + " seconds in which you have to type and send: `!" + this.spamState.keyword + "` as many times as you can. You will win the " + spamName + " if you type the command enough times.\nWhen you are ready to begin, type `!begin`", this.channel, "**"+spamName.toUpperCase()+" "+spamName.toUpperCase()+" "+spamName.toUpperCase()+"**");
	},
	startSpam: function() {
		setTimeout(() => {
			util.sendEmbed("The " + this.spamState.name + " is over!", this.channel)
			if (this.spamState.count < this.spamState.required) {
				util.sendEmbed("",this.channel,"You lost the " + this.spamState.name,{name: this.spamState.keyword + "s sent", value: this.spamState.count})
				this[this.spamState.onFail.transition](this.spamState.onFail.landing || 0);
			} else {
				util.sendEmbed("",this.channel,"You won the " + this.spamState.name,{name: this.spamState.keyword + "s sent", value: this.spamState.count})
				this[this.spamState.onSuccess.transition](this.spamState.onSuccess.landing || 0);
			}
		}, this.spamState.timer);
	},
	getShopItem: function(queryItemName) {
		if (queryItemName in this.shop) {
			return {name: queryItemName, price: this.shop[queryItemName]}
		}
		return null;
	},
	buyItem: function(item) {
		if (item.price > this.budget) {
			let title = "Purchase Failed";
			var fields = [
				{ name: "Item Cost", value: "$" + item.price.toFixed(2) },
				{ name: "Current Budget", value: "$" + this.budget.toFixed(2) }
			];
			util.sendEmbed("You have insufficient funds to purchase \"" + item.name + "\".", this.channel, title, fields);
		} else {
            this.addItem(item);
            this.updateBudget(-item.price,true)
			let title = "Purchase Successful";
			var fields = [
				{ name: "Title", value: item.name },
				{ name: "Price", value: "$" + item.price.toFixed(2) },
				{ name: "Remaining Budget", value: "$" + this.budget.toFixed(2) }
			]
			util.sendEmbed("You have purchased " + item.name + " for $" + item.price.toFixed(2) + ".", this.channel, title, fields);
			this.sendShop();	
		}
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
	updateBudget: function(change, quiet) {
		this.budget = Math.round((this.budget + change + Number.EPSILON) * 100) / 100;
		if (this.budget < 0)
			this.budget = 0;
		let changeStr = (change >= 0) ? "+"+change : change
		if (((quiet === undefined) || !quiet) && change != 0) util.sendEmbed("",this.channel,"Budget Change: " + changeStr,[{name:"Current Budget",value:"$" + this.budget.toFixed(2)}])
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
		let section = this.interactions[this.index];
		if (section === undefined) return;
		if (this.mode == "quiz") {
			this.options = section.options;
			this.quizState.answer = section.answer;
		} else if (this.mode == "dialogue") {
			if ("items" in section) this.shop = section.items;
			let options = [];
			section.options.forEach((option) => {
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
									if (!condTrue) {
										return;
									}
								}
								break condSwitch;
							case 'status':
								// Check all status requirements are met
								for (var statusKey in option.cond.status) {
									let statusBl = option.cond.status[statusKey]
									let condTrue = 	((statusKey in this.status && (this.status[statusKey] == statusBl))
													|| (!(statusKey in this.status) && !statusBl));
									if (!condTrue) {
										return;
									}
								}
								break condSwitch;
							case 'product':
								for (var itemKey in this.items) {
									let item = this.items[itemKey];
									if ("product" in item) {
										for (var i=0; i < option.cond.product.length; i++) {
											if (item.product.toLowerCase().includes(option.cond.product[i])) {
												break condSwitch;
											}
										}
									}
								}
								return;
						}
					}
				}
				options.push(option);
			});
			this.options = options;
		}
	},
	updateIndex: function(toIndex) {
		this.index = toIndex;
		this.updateOptions();
		this.sendPrompt();
		this.sendOptions();
	},
	next: function() {
		if (this.index < this.interactions.length - 1) {
			this.updateIndex(this.index + 1);
		} else {
            util.sendEmbed("You answered " + this.quizState.correct + " out of " + this.interactions.length + " questions correctly.",this.channel);
            if ("text" in this.quizState) util.sendEmbed(this.quizState.text,this.channel);
			if ("result" in this.quizState) {
				let budgetChange = 0;
				if ("eachIncorrect" in this.quizState.result)
					budgetChange = budgetChange + (this.interactions.length - this.quizState.correct) * this.quizState.result.eachIncorrect;
				if ("eachCorrect" in this.quizState.result)
					budgetChange = budgetChange + (this.quizState.correct * this.quizState.result.eachCorrect)
                this.updateBudget(budgetChange);
            }
			this[this.quizState.transition](this.quizState.landing || 0);
		}
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