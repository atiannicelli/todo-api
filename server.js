var express = require('express');
var bodyParser = require('body-parser');
var _ = require('underscore');
var db = require('./db.js')

var app = express();
var PORT = process.env.PORT || 3000;
var todoNextId = 1;
var todos = [];

// 	Todo.create({
// 		description: 'take out trash'
// 	}).then(function(todo) {
// 		return Todo.create({
// 			description: 'feed the cat'
// 		});
// 	}).then(function() {
// 		// return Todo.findById(1)
// 		return Todo.findAll({
// 			where: {
// 				description: {
// 					$like: '%trash%'
// 				}
// 			}
// 		})
// 	}).then(function(todos) {
// 		if (todos) {
// 			todos.forEach(function (todo) {
// 				console.log(todo.toJSON());
// 			})
// 		} else {
// 			console.log('no todo found');
// 		}
// 	}).catch(function(e) {
// 		console.log(e);
// 	})
// });

app.use(bodyParser.json())

app.get('/', function(req, res) {
	res.send('Todo API root');
});

app.get('/todos', function(req, res) {
	var query = req.query;
	var where = {};

	if (query.hasOwnProperty('completed') && query.completed === 'true') {
		where.completed = true;
	} else if (query.hasOwnProperty('completed') && query.completed === 'false') {
		where.completed = false;
	}

	if (query.hasOwnProperty('q') && query.q.length > 0) {
		where.description = {
			$like: '%' + query.q + '%'
		};
	}

	db.todo.findAll({
		where: where
	}).then(function(todos) {
		return res.json(todos)
	}).catch(function(e) {
		return res.status(500).json(e)
	});
	// if (queryParams.hasOwnProperty('completed')) {
	// 	if (queryParams.completed === 'true') {
	// 		filteredTodos = _.where(filteredTodos, {
	// 			completed: true
	// 		})
	// 	} else if (queryParams.completed === 'false') {
	// 		filteredTodos = _.where(filteredTodos, {
	// 			completed: false
	// 		})
	// 	}
	// }
	// if (queryParams.hasOwnProperty('q') && queryParams.q.length > 0) {
	// 	filteredTodos = _.filter(filteredTodos, function(todo) {
	// 		return (todo.description.toLowerCase().indexOf(queryParams.q.toLowerCase()) > -1);
	// 	});
	// }
	// res.json(filteredTodos);

});

app.get('/todos/:id', function(req, res) {
	var todoId = parseInt(req.params.id, 10);

	db.todo.findById(todoId).then(function(todo) {
		if (!!todo) {
			return res.json(todo.toJSON())
		} else {
			return res.status(404).send()
		}
	}).catch(function(e) {
		return res.status(500).json(e)
	});
});

app.delete('/todos/:id', function(req, res) {
	var todoId = parseInt(req.params.id, 10);
	db.todo.destroy({
		where: {
			id: todoId
		}
	}).then(function(rowsDeleted) {
		if (rowsDeleted) {
			return res.status(204).send();
		} else {
			return res.status(404).json({
				error: 'No todo with that ID'
			});
		}
	}).catch(function(e) {
		return res.status(404).json(e)
	});
});

app.put('/todos/:id', function(req, res) {
	var todoId = parseInt(req.params.id, 10);
	var matchedTodo = _.findWhere(todos, {
		"id": todoId
	})
	var body = _.pick(req.body, 'description', 'completed')
	var validAttributes = {};

	if (!matchedTodo) {
		return res.status(404).send();
	}
	if (body.hasOwnProperty('completed') && _.isBoolean(body.completed)) {
		validAttributes.completed = body.completed;
	} else if (body.hasOwnProperty('completed')) {
		return res.status(400).send();
	}

	if (body.hasOwnProperty('description') &&
		_.isString(body.description) &&
		body.description.trim().length > 0) {
		validAttributes.description = body.description;
	} else if (body.hasOwnProperty('description')) {
		return res.status(400).send();
	}

	_.extend(matchedTodo, validAttributes);
	res.json(matchedTodo);
});

app.post('/todos', function(req, res) {
	var body = _.pick(req.body, 'description', 'completed')

	db.todo.create(body).then(function(todo) {
		return res.json(todo.toJSON())
	}).catch(function(e) {
		return res.status(400).json(e)
	});
});

db.sequelize.sync().then(function() {
	app.listen(PORT, function() {
		console.log('Express listening on port ' + PORT + '!');
	});
});