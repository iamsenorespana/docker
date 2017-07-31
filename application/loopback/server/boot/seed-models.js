var async = require('async');
var fs = require('fs');
var path = require('path');

module.exports = function (app) {

	//pokemon data referenced from here (with addition of data attribute): https://github.com/veekun/pokedex/blob/master/pokedex/data/csv/pokemon.csv 
	// var pokemonData = ''
	// fs.readFile(path.join(__dirname, '../pokemon.json'), 'utf-8', function(err, data) {
	// 	if (err) throw err;
	// 	 pokemon.create(JSON.parse(data), function (err, pokemon) {
	//      	if (err) throw err;
	// 	 	console.log('successfully added pokemon data.');
	// 	 });
	// 	pokemonData = JSON.parse(data);
	// });

	var mongoDS = app.dataSources.mongo;

	//create all models
	async.parallel({
		pokemon: async.apply(createPokemons),
	}, function (err, results) {
		if (err) throw err;
	});

	//create pokemon
	function createPokemons(cb) {
		var pokemon = app.models.pokemon;
		//database is empty (assume we have added a JSON object with name bulbasaur)
		pokemon.find({ where: { name: 'bulbasaur' } }, function (err, data) {
			//check if empty
			if (data === undefined || data.name === undefined) {
				console.log('Empty database .... seeding database.');
				mongoDS.automigrate('pokemon', function (err) {
					if (err) return cb(err);
					//read pokemon data from file
					fs.readFile(path.join(__dirname, '../pokemon.json'), 'utf-8', function (err, pokemons) {
						if (err) return cb(err);
						pokemon.create(JSON.parse(pokemons), cb);
						console.log('Successfully seeded database.');
					});
				});
			}
			else {
				console.log('Data already added to database.');
			}			
		});
	}
};