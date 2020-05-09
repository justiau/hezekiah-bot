var util = require('./util');

const states = {
    act1: {
        start: require('./data/act1/start.json'),
        park: require('./data/act1/park.json'),
        drug: require('./data/act1/drug.json'),
        office: require('./data/act1/office.json'),
        church: require('./data/act1/church.json'),
        churchQuiz: require('./data/act1/churchQuiz.json'),
        home: require('./data/act1/home.json'),
        shop: require('./data/act1/shop.json'),
        finish: require('./data/act1/finish.json')
    },
    act2: {
        start: require('./data/act2/start.json'),
        home: require('./data/act2/home.json'),
        office: require('./data/act2/office.json'),
        recruit: require('./data/act2/recruit.json'),
        shop: require('./data/act2/shop.json'),
        shopQuiz: require('./data/act2/shopQuiz.json'),
        war: require('./data/act2/war.json'),
        forest: require('./data/act2/forest.json'),
        finish: require('./data/act2/finish.json'),
        race: require('./data/act2/race.json'),
        postRace: require('./data/act2/postRace.json'),
        church: require('./data/act2/church.json')
    },
    act3: {
        start: require('./data/act3/start.json'),
        home: require('./data/act3/home.json'),
        shop: require('./data/act3/shop.json'),
        forest: require('./data/act3/forest.json'),
        forestQuiz: require('./data/act3/forestQuiz.json'),
        internet: require('./data/act3/internet.json'),
    }
}

module.exports.states = [
	util.createStates(states.act1),
        util.createStates(states.act2),
        util.createStates(states.act3)
]