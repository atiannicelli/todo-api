var express = require('express');
var bodyParser = require('body-parser');
var _ = require('underscore');
var db = require('./db.js');
var bcrypt = require('bcrypt');
var middleware = require('./middleware.js')(db);

var app = express();
var PORT = process.env.PORT || 3000;
var todoNextId = 1;
var todos = [];

app.use(bodyParser.json())

app.get('/', function(req, res) {
	res.send('Todo API root');
});

app.get('/todos', middleware.requireAuthentication, function(req, res) {
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

app.get('/todos/:id', middleware.requireAuthentication, function(req, res) {
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

app.delete('/todos/:id', middleware.requireAuthentication, function(req, res) {
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

app.put('/todos/:id', middleware.requireAuthentication, function(req, res) {
	var todoId = parseInt(req.params.id, 10);
	var body = _.pick(req.body, 'description', 'completed')
	var attributes = {};

	if (body.hasOwnProperty('completed')) {
		attributes.completed = body.completed;
	}

	if (body.hasOwnProperty('description')) {
		attributes.description = body.description;
	}

	db.todo.findById(todoId).then(function(todo) {
		if (todo) {
			todo.update(attributes).then(function(todo) {
				res.json(todo.toJSON());
			}, function(e) {
				return res.status(400).send(e);
			});
		} else {
			res.status(404).send();
		}
	}, function(e) {
		return res.status(500).send();
	});
});

app.post('/todos', middleware.requireAuthentication, function(req, res) {
	var body = _.pick(req.body, 'description', 'completed')

	db.todo.create(body).then(function(todo) {
		return res.json(todo.toJSON())
	}).catch(function(e) {
		return res.status(400).json(e)
	});
});

app.post('/users', function(req, res) {
	var body = _.pick(req.body, 'email', 'password')

	db.user.create(body).then(function(user) {
		res.json(user.toPublicJSON())
	}, function(e) {
		res.status(400).json(e)
	});
});

app.post('/users/login', function(req, res) {
	var body = _.pick(req.body, 'email', 'password');

	db.user.authenticate(body).then(function (user){
		var token = user.generateToken('authentication')
		if (!token) {
		 	res.status(401).send();
		}
		res.header('Auth', token).json(user.toPublicJSON());
	}, function () {
	 	res.status(401).send();
	});
});

db.sequelize.sync({
	force: true
}).then(function() {
	app.listen(PORT, function() {
		console.log('Express listening on port ' + PORT + '!');
	});
});